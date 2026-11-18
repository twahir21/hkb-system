"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypeEnum } from "@/lib/db/schema";
import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  employeeInScope,
  getLeaveBalance,
  getLeaveScope,
  hasOverlappingLeave,
} from "@/features/leave/queries/leave";
import { leaveDays } from "@/features/leave/rules";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe si sahihi");

const requestSchema = z
  .object({
    userId: z.string().uuid().optional(),
    type: z.enum(leaveTypeEnum.enumValues),
    startDate: DATE,
    endDate: DATE,
    reason: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "Tarehe ya mwisho iko kabla ya kuanza" })
  .refine((v) => leaveDays(v.startDate, v.endDate) <= 180, { message: "Likizo isizidi siku 180" });

function revalidate() {
  revalidatePath("/leave");
  revalidatePath("/mpangokazi");
  revalidatePath("/dashboard");
}

/** Request leave for yourself, or (HR / Secretary / Office Assistant) for an employee. */
export async function requestLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("LEAVE_REQUEST_OWN");
  const parsed = requestSchema.safeParse({
    userId: formData.get("userId") || undefined,
    type: formData.get("type") ?? undefined,
    startDate: formData.get("startDate") ?? undefined,
    endDate: formData.get("endDate") ?? undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ombi si sahihi" };
  const v = parsed.data;

  const forUserId = v.userId ?? user.userId;
  if (forUserId !== user.userId) {
    if (!hasPermission(user.role, "LEAVE_FILE_FOR_OTHERS")) {
      return { ok: false, error: "Huna ruhusa ya kuombea mtumishi mwingine." };
    }
    const scope = await getLeaveScope(user);
    if (!(await employeeInScope(scope, forUserId))) {
      return { ok: false, error: "Mtumishi huyu si wa tawi lako." };
    }
  }

  if (await hasOverlappingLeave(forUserId, v.startDate, v.endDate)) {
    return { ok: false, error: "Tayari kuna likizo nyingine kwenye tarehe hizi." };
  }

  const days = leaveDays(v.startDate, v.endDate);
  const balance = (await getLeaveBalance(forUserId, Number(v.startDate.slice(0, 4)))).find((b) => b.type === v.type);
  if (balance?.left !== null && balance !== undefined && days > balance.left) {
    return { ok: false, error: `Salio halitoshi: zimebaki siku ${Math.max(balance.left ?? 0, 0)}.` };
  }

  const [created] = await db
    .insert(leaveRequests)
    .values({
      userId: forUserId,
      type: v.type,
      startDate: v.startDate,
      endDate: v.endDate,
      days,
      reason: v.reason ?? null,
      requestedById: user.userId,
    })
    .returning({ id: leaveRequests.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "LEAVE_REQUEST",
    entity: "leave_requests",
    entityId: created.id,
    metadata: { forUserId, type: v.type, days },
  });
  revalidate();
  return { ok: true, message: "Ombi la likizo limetumwa." };
}

/** Approve / reject (HR, IT) or cancel (the employee or whoever filed it, while pending). */
export async function decideLeave(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Hujaingia." };
  const parsed = z
    .object({
      id: z.string().uuid(),
      decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
      notes: z.string().trim().max(2000).optional(),
    })
    .safeParse({ id: formData.get("id"), decision: formData.get("decision"), notes: formData.get("notes") || undefined });
  if (!parsed.success) return { ok: false, error: "Ombi si sahihi." };
  const v = parsed.data;

  const req = await db.query.leaveRequests.findFirst({ where: eq(leaveRequests.id, v.id) });
  if (!req) return { ok: false, error: "Ombi halipatikani." };
  if (req.status !== "PENDING") return { ok: false, error: "Ombi hili tayari limeshughulikiwa." };

  if (v.decision === "CANCELLED") {
    if (req.userId !== user.userId && req.requestedById !== user.userId) {
      return { ok: false, error: "Huwezi kughairi ombi hili." };
    }
  } else if (!hasPermission(user.role, "LEAVE_APPROVE")) {
    return { ok: false, error: "Huna ruhusa ya kuidhinisha likizo." };
  } else if (req.userId === user.userId) {
    return { ok: false, error: "Huwezi kuidhinisha likizo yako mwenyewe." };
  }

  await db
    .update(leaveRequests)
    .set({
      status: v.decision,
      reviewedById: user.userId,
      reviewedAt: new Date(),
      reviewNotes: v.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(leaveRequests.id, v.id), eq(leaveRequests.status, "PENDING")));

  await writeAuditLog({
    actorId: user.userId,
    action: `LEAVE_${v.decision}`,
    entity: "leave_requests",
    entityId: v.id,
  });
  revalidate();
  return {
    ok: true,
    message: v.decision === "APPROVED" ? "Imeidhinishwa." : v.decision === "REJECTED" ? "Imekataliwa." : "Imeghairiwa.",
  };
}
