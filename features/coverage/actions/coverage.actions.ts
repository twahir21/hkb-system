"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverageRequests, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { coverageRequestUpdateSchema } from "@/lib/validators/schemas";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** Super Admin only — update status and/or internal notes of a request. */
export async function updateCoverageRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("COVERAGE_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing request id" };

  const status = formData.get("status") ?? undefined;
  const internalNotes = formData.get("internalNotes") ?? undefined;

  const parsed = coverageRequestUpdateSchema.safeParse({
    status: typeof status === "string" && status ? status : undefined,
    internalNotes:
      typeof internalNotes === "string" && internalNotes.trim()
        ? internalNotes
        : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update" };
  }
  const { status: nextStatus, internalNotes: notes } = parsed.data;

  const existing = await db.query.coverageRequests.findFirst({
    where: eq(coverageRequests.id, id),
  });
  if (!existing) return { ok: false, error: "Coverage request not found." };

  await db
    .update(coverageRequests)
    .set({
      status: nextStatus ?? existing.status,
      internalNotes: notes ?? existing.internalNotes,
      handledById: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(coverageRequests.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "COVERAGE_REQUEST_UPDATE",
    entity: "coverage_requests",
    entityId: id,
    metadata: {
      status: nextStatus ?? existing.status,
      notesUpdated: Boolean(notes),
    },
  });

  revalidatePath("/coverage-requests");
  revalidatePath("/dashboard");
  return { ok: true, message: "Coverage request updated." };
}

/** Super Admin only — permanently delete a coverage request. */
export async function deleteCoverageRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("COVERAGE_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing request id" };

  const existing = await db.query.coverageRequests.findFirst({
    where: eq(coverageRequests.id, id),
  });
  if (!existing) return { ok: false, error: "Coverage request not found." };

  await db.delete(coverageRequests).where(eq(coverageRequests.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "COVERAGE_REQUEST_DELETE",
    entity: "coverage_requests",
    entityId: id,
    metadata: { name: existing.fullName, email: existing.email },
  });

  revalidatePath("/coverage-requests");
  revalidatePath("/dashboard");
  return { ok: true, message: "Coverage request deleted." };
}

/** Any coverage viewer (Super Admin / HR / Bursar) marks requests as seen. */
export async function markCoverageRequestsSeen(): Promise<void> {
  const actor = await requirePermission("COVERAGE_VIEW");
  await db
    .update(users)
    .set({ coverageRequestsLastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, actor.userId));
}