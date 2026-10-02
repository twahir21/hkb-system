"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobApplications } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { deleteFile } from "@/lib/firebase/firebase-admin";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { jobApplicationUpdateSchema } from "@/features/jobs/validators/jobs.schema";
import {
  processJobApplicationSubmission,
  type JobApplicationState,
} from "@/features/jobs/lib/submit";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";
export type { JobApplicationState } from "@/features/jobs/lib/submit";

/**
 * Public, unauthenticated submission for the /jobs page (Nafasi za Ajira).
 * Basic per-IP rate limit via Upstash Redis (graceful no-op when unconfigured),
 * then the shared pipeline in features/jobs/lib/submit.ts validates the
 * payload, stores the eight attachments in Firebase Storage and inserts a NEW
 * job_application for HR / Super Admin review.
 *
 * The marketing website posts to `POST /api/job-applications` instead — both
 * entry points share the exact same pipeline.
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

  return processJobApplicationSubmission(formData);
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
    deleteFile(existing.passportUrl),
    deleteFile(existing.localGovLetterUrl),
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
