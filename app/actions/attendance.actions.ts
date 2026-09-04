"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { attendanceLogs } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { markAttendanceSchema } from "@/lib/validators/schemas";
import { tryAcquireShiftLock, releaseShiftLock } from "@/lib/redis";
import { getSupervisorIdForGuard } from "@/lib/queries";
import { uploadSickNote as uploadSickNoteToStorage } from "@/lib/storage/firebase-admin";

export type ActionState = { ok: boolean; error?: string; message?: string; url?: string };

export async function markAttendance(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("ATTENDANCE_RECORD");

  const parsed = markAttendanceSchema.safeParse({
    guardId: formData.get("guardId") ?? undefined,
    date: formData.get("date") ?? undefined,
    shift: formData.get("shift") ?? undefined,
    status: formData.get("status") ?? undefined,
    absenceCategory: formData.get("absenceCategory") || undefined,
    allowedDays: formData.get("allowedDays") ? Number(formData.get("allowedDays")) : undefined,
    minutesLate: formData.get("minutesLate") ? Number(formData.get("minutesLate")) : undefined,
    reason: formData.get("reason") || undefined,
    documentUrl: formData.get("documentUrl") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Plain supervisors may only record their own assigned guards.
  if (user.role === "SUPERVISOR") {
    const assigned = await getSupervisorIdForGuard(v.guardId);
    if (assigned !== user.userId) {
      return { ok: false, error: "This guard is not assigned to you." };
    }
  }

  const lockKey = `shift-lock:${v.guardId}:${v.date}:${v.shift}`;
  const acquired = await tryAcquireShiftLock(lockKey, 300);
  if (!acquired) {
    return { ok: false, error: "This shift is already being processed — try again shortly." };
  }

  try {
    await db
      .insert(attendanceLogs)
      .values({
        guardId: v.guardId,
        supervisorId: user.userId,
        date: v.date,
        shift: v.shift,
        status: v.status,
        absenceCategory: v.absenceCategory ?? null,
        allowedDays: v.allowedDays ?? null,
        minutesLate: v.minutesLate ?? null,
        reason: v.reason ?? null,
        documentUrl: v.documentUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [attendanceLogs.guardId, attendanceLogs.date, attendanceLogs.shift],
        set: {
          supervisorId: user.userId,
          status: v.status,
          absenceCategory: v.absenceCategory ?? null,
          allowedDays: v.allowedDays ?? null,
          minutesLate: v.minutesLate ?? null,
          reason: v.reason ?? null,
          documentUrl: v.documentUrl ?? null,
          updatedAt: new Date(),
        },
      });
  } finally {
    await releaseShiftLock(lockKey);
  }

  await writeAuditLog({
    actorId: user.userId,
    action: "ATTENDANCE_UPSERT",
    entity: "attendance_logs",
    entityId: v.guardId,
    metadata: {
      date: v.date,
      shift: v.shift,
      status: v.status,
      category: v.absenceCategory,
      minutesLate: v.minutesLate,
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/records");
  revalidatePath("/dashboard");
  return { ok: true, message: "Attendance saved." };
}

/** Quick clock-in for PRESENT via a plain <form action>. */
export async function markPresentOnly(formData: FormData): Promise<void> {
  await markAttendance({ ok: false }, formData);
}

/** Server-side sick-note upload via Firebase Admin. Returns the public URL. */
export async function uploadSickNote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermission("ATTENDANCE_RECORD");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file was provided." };
  }
  if (!file.type.includes("pdf") && !file.type.includes("image")) {
    return { ok: false, error: "Only PDF or image documents are accepted." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "File exceeds the 8MB limit." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadSickNoteToStorage(buffer, file.name, file.type);
  if (!url) {
    return { ok: false, error: "Document storage is not configured on the server." };
  }
  return { ok: true, url, message: "Document uploaded." };
}