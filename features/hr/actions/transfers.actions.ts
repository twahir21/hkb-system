"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardProfiles, transferRequests } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  transferActionSchema,
  transferSchema,
} from "@/features/hr/validators/transfer.schema";
import { redis } from "@/lib/redis";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** Supervisor / Senior Supervisor submits a transfer request. */
export async function submitTransfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("TRANSFER_INITIATE");

  const parsed = transferSchema.safeParse({
    guardId: formData.get("guardId") ?? undefined,
    toSupervisorId: formData.get("toSupervisorId") ?? undefined,
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid transfer",
    };
  }
  const v = parsed.data;

  // Current supervisor is the requester by default.
  const profile = await db.query.guardProfiles.findFirst({
    where: eq(guardProfiles.id, v.guardId),
    columns: { assignedSupervisorId: true },
  });

  const [request] = await db
    .insert(transferRequests)
    .values({
      guardId: v.guardId,
      fromSupervisorId: profile?.assignedSupervisorId ?? actor.userId,
      toSupervisorId: v.toSupervisorId,
      requestedBy: actor.userId,
      reason: v.reason,
      status: "PENDING",
    })
    .returning();

  // Publish a lightweight event so an external worker/emailer can pick it up.
  if (redis) {
    await redis.publish(
      "transfer-events",
      JSON.stringify({ id: request.id, event: "CREATED" }),
    );
  }

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRANSFER_REQUEST",
    entity: "transfer_requests",
    entityId: request.id,
    metadata: { from: v.toSupervisorId }, // guard moved to supervisor
  });

  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  return { ok: true, message: "Transfer request submitted." };
}

/** Super Admin / HR approve or reject a transfer. */
export async function approveOrRejectTransfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("TRANSFER_APPROVE");

  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Missing request id" };

  const parsed = transferActionSchema.safeParse({
    action: formData.get("action") ?? undefined,
    reviewerNotes: formData.get("reviewerNotes") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid action",
    };
  }
  const { action, reviewerNotes } = parsed.data;

  const request = await db.query.transferRequests.findFirst({
    where: eq(transferRequests.id, id),
  });
  if (!request) return { ok: false, error: "Transfer request not found." };
  if (request.status !== "PENDING") {
    return { ok: false, error: "Transfer already processed." };
  }

  await db
    .update(transferRequests)
    .set({
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewerNotes: reviewerNotes ?? null,
      approvedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(transferRequests.id, id));

  if (action === "APPROVE") {
    await db
      .update(guardProfiles)
      .set({ assignedSupervisorId: request.toSupervisorId })
      .where(eq(guardProfiles.id, request.guardId));
  }

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRANSFER_" + action,
    entity: "transfer_requests",
    entityId: id,
    metadata: { reviewerNotes: reviewerNotes ?? null },
  });

  revalidatePath("/transfers");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: `Transfer ${action.toLowerCase()}.` };
}
