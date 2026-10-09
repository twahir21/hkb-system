// NOTE: revalidatePath is intentionally NOT imported here.
// This pipeline is shared by both a Server Action and a Route Handler.
// revalidatePath throws when called from a Route Handler context
// ("called outside a request scope"). The server action (jobs.actions.ts)
// calls revalidatePath itself after this function returns.
import { db } from "@/lib/db";
import { jobApplications } from "@/lib/db/schema";
import { uploadFile } from "@/lib/firebase/firebase-admin";
import {
  JOB_DOCUMENT_FIELDS,
  isAllowedJobDocument,
  jobApplicationSchema,
} from "@/features/jobs/validators/jobs.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

/**
 * Shared submission pipeline for the public /jobs application
 * (Nafasi za Ajira — Walinzi 100).
 *
 * It is the single source of truth for validation, attachment uploads and the
 * insert, and is consumed by BOTH:
 *   - the `submitJobApplication` server action (system-side forms), and
 *   - the public `POST /api/job-applications` endpoint that the marketing
 *     website (www.hkbprotection.co.tz) posts to.
 *
 * Rate limiting is deliberately NOT handled here — each entry point applies
 * its own per-IP guard (the server action reads `headers()`, the API route
 * reads the incoming request).
 */

/** Submission state — adds per-field (Kiswahili) errors for the public form. */
export type JobApplicationState = ActionState & {
  fieldErrors?: Record<string, string>;
};

/** Form field name → job_applications column for each attachment. */
const DOCUMENT_COLUMNS: Record<
  string,
  | "letterUrl"
  | "localGovLetterUrl"
  | "certificatesUrl"
  | "cvUrl"
  | "passportUrl"
  | "healthUrl"
  | "conductUrl"
  | "mdhamini1LocalGovUrl"
  | "mdhamini1NidaUrl"
  | "mdhamini1SponsorUrl"
  | "mdhamini2LocalGovUrl"
  | "mdhamini2NidaUrl"
  | "mdhamini2SponsorUrl"
> = {
  letterFile: "letterUrl",
  localGovLetterFile: "localGovLetterUrl",
  certificatesFile: "certificatesUrl",
  cvFile: "cvUrl",
  passportFile: "passportUrl",
  healthFile: "healthUrl",
  conductFile: "conductUrl",
  mdhamini1LocalGovFile: "mdhamini1LocalGovUrl",
  mdhamini1NidaFile: "mdhamini1NidaUrl",
  mdhamini1SponsorFile: "mdhamini1SponsorUrl",
  mdhamini2LocalGovFile: "mdhamini2LocalGovUrl",
  mdhamini2NidaFile: "mdhamini2NidaUrl",
  mdhamini2SponsorFile: "mdhamini2SponsorUrl",
};

/**
 * Validates the Kiswahili payload, stores the attachments in Firebase
 * Storage and inserts a NEW job_application for HR / Super Admin review.
 *
 * @param requestId - optional short ID passed from the Route Handler so all
 *   log lines for the same HTTP request can be correlated in production logs.
 */
export async function processJobApplicationSubmission(
  formData: FormData,
  requestId = "direct"
): Promise<JobApplicationState> {
  const tag = `[submit][${requestId}]`;
  console.log(`${tag} starting — fields present: [${[...formData.keys()].join(", ")}]`);

  // ── Phase 0: Zod validation ──────────────────────────────────────────────
  const parsed = jobApplicationSchema.safeParse({
    fullName: formData.get("fullName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") || undefined,
    age: formData.get("age") ?? undefined,
    gender: formData.get("gender") ?? undefined,
    residence: formData.get("residence") ?? undefined,
    educationLevel: formData.get("educationLevel") ?? undefined,
    training: formData.get("training") || undefined, // optional ("" → undefined)
    source: formData.get("source") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    console.warn(`${tag} Phase 0 FAILED (Zod) — field: ${String(field)}, message: ${issue?.message}`);
    return {
      ok: false,
      error: issue?.message ?? "Taarifa si sahihi. Tafadhali angalia upya.",
      ...(typeof field === "string"
        ? { fieldErrors: { [field]: issue?.message ?? "Si sahihi." } }
        : {}),
    };
  }
  console.log(`${tag} Phase 0 passed — applicant: "${parsed.data.fullName}", source: ${parsed.data.source ?? "(none)"}`);
  const v = parsed.data;

  // ── Phase 1: attachment validation ──────────────────────────────────────
  const files = new Map<string, File>();
  const fieldErrors: Record<string, string> = {};
  for (const doc of JOB_DOCUMENT_FIELDS) {
    const raw = formData.get(doc.name);
    const missing =
      typeof File === "undefined" ||
      !(raw instanceof File) ||
      raw.size === 0 ||
      !raw.name;
    if (missing) {
      if (doc.required) {
        console.warn(`${tag} Phase 1 — missing required file: ${doc.name}`);
        fieldErrors[doc.name] = `${doc.label}: faili linahitajika.`;
      } else {
        console.log(`${tag} Phase 1 — optional file skipped: ${doc.name}`);
      }
      continue;
    }
    const invalid = isAllowedJobDocument(raw, doc.pdfOnly);
    if (invalid) {
      console.warn(`${tag} Phase 1 — invalid file: ${doc.name} (${raw.type}, ${raw.size} bytes) — ${invalid}`);
      fieldErrors[doc.name] = `${doc.label}: ${invalid}`;
      continue;
    }
    console.log(`${tag} Phase 1 — accepted: ${doc.name} (${raw.type}, ${raw.size} bytes)`);
    files.set(doc.name, raw);
  }
  if (Object.keys(fieldErrors).length > 0) {
    console.warn(`${tag} Phase 1 FAILED — field errors:`, fieldErrors);
    return {
      ok: false,
      error: "Hakikisha viambatanisho vyote viko sahihi (kila faili uwe MB 2 au chini).",
      fieldErrors,
    };
  }
  console.log(`${tag} Phase 1 passed — ${files.size} file(s) ready for upload`);

  // ── Phase 2: Firebase Storage uploads ───────────────────────────────────
  const urls: Partial<Record<keyof typeof DOCUMENT_COLUMNS, string>> = {};
  for (const doc of JOB_DOCUMENT_FIELDS) {
    const file = files.get(doc.name);
    if (!file) continue; // optional document left blank
    console.log(`${tag} Phase 2 — uploading: ${doc.name} (${file.type}, ${file.size} bytes)`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, file.name, file.type, "job-applications");
    if (!url) {
      console.error(`${tag} Phase 2 FAILED — uploadFile returned null for: ${doc.name}`);
      return {
        ok: false,
        error: `Imeshindikana kupakia "${doc.label}". Jaribu tena baadaye.`,
      };
    }
    console.log(`${tag} Phase 2 — uploaded: ${doc.name} → ${url}`);
    urls[DOCUMENT_COLUMNS[doc.name]] = url;
  }

  // ── Phase 3: DB insert ───────────────────────────────────────────────────
  console.log(`${tag} Phase 2 complete — all uploads done. Starting Phase 3 (DB insert)…`);
  try {
    const [row] = await db
      .insert(jobApplications)
      .values({
        fullName: v.fullName,
        phone: v.phone,
        email: v.email || null,
        age: v.age,
        gender: v.gender,
        residence: v.residence,
        educationLevel: v.educationLevel,
        training: v.training || null,
        letterUrl: urls.letterUrl!,
        localGovLetterUrl: urls.localGovLetterUrl!,
        certificatesUrl: urls.certificatesUrl ?? null, // hiari (optional)
        cvUrl: urls.cvUrl!,
        passportUrl: urls.passportUrl!,
        refereesUrl: null, // historical — no longer collected
        healthUrl: urls.healthUrl ?? "",
        conductUrl: urls.conductUrl ?? "",
        mdhamini1LocalGovUrl: urls.mdhamini1LocalGovUrl ?? "",
        mdhamini1NidaUrl: urls.mdhamini1NidaUrl ?? "",
        mdhamini1SponsorUrl: urls.mdhamini1SponsorUrl ?? "",
        mdhamini2LocalGovUrl: urls.mdhamini2LocalGovUrl ?? "",
        mdhamini2NidaUrl: urls.mdhamini2NidaUrl ?? "",
        mdhamini2SponsorUrl: urls.mdhamini2SponsorUrl ?? "",
        source: v.source || "jobs-page",
        status: "NEW",
      })
      .returning({ id: jobApplications.id });

    // revalidatePath("/job-applications") is deliberately omitted — see top of file.
    console.log(`${tag} Phase 3 passed — application saved, id: ${row.id}`);
    return {
      ok: true,
      message:
        "Maombi yako yamepokelewa kikamilifu! Tutawasiliana nawo kwa namba uliyotoa ikiwa utafaulu hatua ya kwanza.",
      url: row.id,
    };
  } catch (error) {
    console.error(`${tag} Phase 3 FAILED (DB insert):`, error);
    return {
      ok: false,
      error:
        "Imeshindikana kuhifadhi maombi yako. Tafadhali jaribu tena baadaye au piga simu ofisini.",
    };
  }
}
