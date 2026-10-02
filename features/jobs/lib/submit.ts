import { revalidatePath } from "next/cache";
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
  | "refereesUrl"
  | "healthUrl"
  | "conductUrl"
> = {
  letterFile: "letterUrl",
  localGovLetterFile: "localGovLetterUrl",
  certificatesFile: "certificatesUrl",
  cvFile: "cvUrl",
  passportFile: "passportUrl",
  refereesFile: "refereesUrl",
  healthFile: "healthUrl",
  conductFile: "conductUrl",
};

/**
 * Validates the Kiswahili payload, stores the eight attachments in Firebase
 * Storage and inserts a NEW job_application for HR / Super Admin review.
 */
export async function processJobApplicationSubmission(
  formData: FormData
): Promise<JobApplicationState> {
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
    return {
      ok: false,
      error: issue?.message ?? "Taarifa si sahihi. Tafadhali angalia upya.",
      ...(typeof field === "string"
        ? { fieldErrors: { [field]: issue?.message ?? "Si sahihi." } }
        : {}),
    };
  }
  const v = parsed.data;

  // Phase 1 — validate every attachment before uploading anything.
  const files = new Map<string, File>();
  const fieldErrors: Record<string, string> = {};
  for (const doc of JOB_DOCUMENT_FIELDS) {
    const raw = formData.get(doc.name);
    if (
      typeof File === "undefined" ||
      !(raw instanceof File) ||
      raw.size === 0 ||
      !raw.name
    ) {
      fieldErrors[doc.name] = `${doc.label}: faili linahitajika.`;
      continue;
    }
    const invalid = isAllowedJobDocument(raw, doc.pdfOnly);
    if (invalid) {
      fieldErrors[doc.name] = `${doc.label}: ${invalid}`;
      continue;
    }
    files.set(doc.name, raw);
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Hakikisha viambatanisho vyote viko sahihi (kila faili uwe MB 2 au chini).",
      fieldErrors,
    };
  }

  // Phase 2 — upload to Firebase Storage (folder: job-applications).
  const urls: Partial<Record<keyof typeof DOCUMENT_COLUMNS, string>> = {};
  for (const doc of JOB_DOCUMENT_FIELDS) {
    const file = files.get(doc.name)!;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, file.name, file.type, "job-applications");
    if (!url) {
      return {
        ok: false,
        error: `Imeshindikana kupakia "${doc.label}". Jaribu tena baadaye.`,
      };
    }
    urls[DOCUMENT_COLUMNS[doc.name]] = url;
  }

  // Phase 3 — record the application.
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
        certificatesUrl: urls.certificatesUrl!,
        cvUrl: urls.cvUrl!,
        passportUrl: urls.passportUrl!,
        refereesUrl: urls.refereesUrl!,
        healthUrl: urls.healthUrl!,
        conductUrl: urls.conductUrl!,
        source: v.source || "jobs-page",
        status: "NEW",
      })
      .returning({ id: jobApplications.id });

    revalidatePath("/job-applications");
    return {
      ok: true,
      message:
        "Maombi yako yamepokelewa kikamilifu! Tutawasiliana nawo kwa namba uliyotoa ikiwa utafaulu hatua ya kwanza.",
      url: row.id,
    };
  } catch (error) {
    console.error("[jobs] failed to insert job application:", error);
    return {
      ok: false,
      error:
        "Imeshindikana kuhifadhi maombi yako. Tafadhali jaribu tena baadaye au piga simu ofisini.",
    };
  }
}
