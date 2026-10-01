"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobApplications } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { uploadFile, deleteFile } from "@/lib/firebase/firebase-admin";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  JOB_DOCUMENT_FIELDS,
  isAllowedJobDocument,
  jobApplicationSchema,
  jobApplicationUpdateSchema,
} from "@/features/jobs/validators/jobs.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** Submission state — adds per-field (Kiswahili) errors for the public form. */
export type JobApplicationState = ActionState & {
  fieldErrors?: Record<string, string>;
};

/** Form field name → job_applications column for each attachment. */
const DOCUMENT_COLUMNS: Record<
  string,
  "letterUrl" | "certificatesUrl" | "cvUrl" | "refereesUrl" | "healthUrl" | "conductUrl"
> = {
  letterFile: "letterUrl",
  certificatesFile: "certificatesUrl",
  cvFile: "cvUrl",
  refereesFile: "refereesUrl",
  healthFile: "healthUrl",
  conductFile: "conductUrl",
};

/**
 * Public, unauthenticated submission for the /jobs page (Nafasi za Ajira).
 * Basic per-IP rate limit via Upstash Redis (graceful no-op when unconfigured),
 * validates the Kiswahili payload, stores the six attachments in Firebase
 * Storage and inserts a NEW job_application for HR / Super Admin review.
 */
export async function submitJobApplication(
  _prev: JobApplicationState,
  formData: FormData
): Promise<JobApplicationState> {
  // Abuse guard: 5 submissions per IP per 10 minutes (mirrors request-coverage).
  const requestHeaders = await headers();
  const ip =
    (requestHeaders.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  if (redis) {
    const key = `rl:job-application:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 600);
      if (count > 5) {
        return {
          ok: false,
          error:
            "Maombi mengi sana kutoka kwenye kifaa hiki. Tafadhali jaribu tena baada ya dakika 10.",
        };
      }
    } catch {
      // Redis hiccup — never block a legitimate applicant because of it.
    }
  }

  const parsed = jobApplicationSchema.safeParse({
    fullName: formData.get("fullName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") || undefined,
    age: formData.get("age") ?? undefined,
    gender: formData.get("gender") ?? undefined,
    residence: formData.get("residence") ?? undefined,
    educationLevel: formData.get("educationLevel") ?? undefined,
    training: formData.get("training") ?? undefined,
    preferredStation: formData.get("preferredStation") ?? undefined,
    notes: formData.get("notes") || undefined,
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
        training: v.training,
        preferredStation: v.preferredStation,
        notes: v.notes || null,
        letterUrl: urls.letterUrl!,
        certificatesUrl: urls.certificatesUrl!,
        cvUrl: urls.cvUrl!,
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

/** HR / Super Admin — update status and/or internal notes of an application. */
export async function updateJobApplication(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("JOB_APPLICATIONS_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing application id" };

  const status = formData.get("status") ?? undefined;
  const internalNotes = formData.get("internalNotes") ?? undefined;

  const parsed = jobApplicationUpdateSchema.safeParse({
    status: typeof status === "string" && status ? status : undefined,
    internalNotes:
      typeof internalNotes === "string" && internalNotes.trim() ? internalNotes : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update" };
  }
  const { status: nextStatus, internalNotes: notes } = parsed.data;

  const existing = await db.query.jobApplications.findFirst({
    where: eq(jobApplications.id, id),
  });
  if (!existing) return { ok: false, error: "Job application not found." };

  await db
    .update(jobApplications)
    .set({
      status: nextStatus ?? existing.status,
      internalNotes: notes ?? existing.internalNotes,
      handledById: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(jobApplications.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "JOB_APPLICATION_UPDATE",
    entity: "job_applications",
    entityId: id,
    metadata: {
      status: nextStatus ?? existing.status,
      notesUpdated: Boolean(notes),
    },
  });

  revalidatePath("/job-applications");
  return { ok: true, message: "Job application updated." };
}

/** HR / Super Admin — permanently delete an application (and its documents). */
export async function deleteJobApplication(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("JOB_APPLICATIONS_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing application id" };

  const existing = await db.query.jobApplications.findFirst({
    where: eq(jobApplications.id, id),
  });
  if (!existing) return { ok: false, error: "Job application not found." };

  await db.delete(jobApplications).where(eq(jobApplications.id, id));

  // Best-effort cleanup of the uploaded attachments.
  await Promise.allSettled([
    deleteFile(existing.letterUrl),
    deleteFile(existing.certificatesUrl),
    deleteFile(existing.cvUrl),
    deleteFile(existing.refereesUrl),
    deleteFile(existing.healthUrl),
    deleteFile(existing.conductUrl),
  ]);

  await writeAuditLog({
    actorId: actor.userId,
    action: "JOB_APPLICATION_DELETE",
    entity: "job_applications",
    entityId: id,
    metadata: { name: existing.fullName, phone: existing.phone },
  });

  revalidatePath("/job-applications");
  return { ok: true, message: "Job application deleted." };
}
