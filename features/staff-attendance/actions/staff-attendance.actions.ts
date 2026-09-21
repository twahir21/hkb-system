"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { staffAttendanceLogs, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  markStaffAttendanceSchema,
  batchMarkStaffPresentSchema,
  clearStaffAttendanceSchema,
} from "@/features/staff-attendance/validators/staff-attendance.schema";
import { uploadFile as uploadFileToStorage } from "@/lib/firebase/firebase-admin";

export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  url?: string;
};

/** Mark or update a single staff member's daily attendance */
export async function markStaffAttendance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("STAFF_ATTENDANCE_RECORD");

  const parsed = markStaffAttendanceSchema.safeParse({
    userId: formData.get("userId") ?? undefined,
    date: formData.get("date") ?? undefined,
    status: formData.get("status") ?? undefined,
    checkInTime: formData.get("checkInTime") || undefined,
    absenceCategory: formData.get("absenceCategory") || undefined,
    allowedDays: formData.get("allowedDays")
      ? Number(formData.get("allowedDays"))
      : undefined,
    minutesLate: formData.get("minutesLate")
      ? Number(formData.get("minutesLate"))
      : undefined,
    reason: formData.get("reason") || undefined,
    documentUrl: formData.get("documentUrl") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const v = parsed.data;

  // If already logged, editing requires STAFF_ATTENDANCE_EDIT
  const [existing] = await db
    .select({ id: staffAttendanceLogs.id, status: staffAttendanceLogs.status })
    .from(staffAttendanceLogs)
    .where(
      and(
        eq(staffAttendanceLogs.userId, v.userId),
        eq(staffAttendanceLogs.date, v.date),
      ),
    )
    .limit(1);

  if (existing) {
    await requirePermission("STAFF_ATTENDANCE_EDIT");
  }

  await db
    .insert(staffAttendanceLogs)
    .values({
      userId: v.userId,
      date: v.date,
      status: v.status,
      checkInTime: v.checkInTime ?? null,
      absenceCategory: v.absenceCategory ?? null,
      allowedDays: v.allowedDays ?? null,
      minutesLate: v.minutesLate ?? null,
      reason: v.reason ?? null,
      documentUrl: v.documentUrl ?? null,
      recordedById: user.userId,
    })
    .onConflictDoUpdate({
      target: [staffAttendanceLogs.userId, staffAttendanceLogs.date],
      set: {
        status: v.status,
        checkInTime: v.checkInTime ?? null,
        absenceCategory: v.absenceCategory ?? null,
        allowedDays: v.allowedDays ?? null,
        minutesLate: v.minutesLate ?? null,
        reason: v.reason ?? null,
        documentUrl: v.documentUrl ?? null,
        recordedById: user.userId,
        updatedAt: new Date(),
      },
    });

  await writeAuditLog({
    actorId: user.userId,
    action: "STAFF_ATTENDANCE_UPSERT",
    entity: "staff_attendance_logs",
    entityId: v.userId,
    metadata: {
      date: v.date,
      status: v.status,
      category: v.absenceCategory,
      minutesLate: v.minutesLate,
      checkInTime: v.checkInTime,
    },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Staff attendance recorded successfully." };
}

/** Quick 1-click clock-in for PRESENT via plain <form action> */
export async function markStaffPresentOnly(formData: FormData): Promise<void> {
  const date = formData.get("date") as string;
  const result = await markStaffAttendance({ ok: false }, formData);
  if (!result.ok) {
    redirect(
      `/staff-attendance?date=${encodeURIComponent(date)}&error=${encodeURIComponent(result.error ?? "Failed to mark staff attendance.")}`,
    );
  }
}

/** Bulk mark all unmarked staff as PRESENT for the day */
export async function markAllStaffPresent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("STAFF_ATTENDANCE_RECORD");

  const parsed = batchMarkStaffPresentSchema.safeParse({
    date: formData.get("date") ?? undefined,
    checkInTime: formData.get("checkInTime") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid date",
    };
  }

  const { date, checkInTime } = parsed.data;

  // Find all non-guard users
  const staffUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(ne(users.role, "GUARD"));

  // Find users already marked on this date
  const existingLogs = await db
    .select({ userId: staffAttendanceLogs.userId })
    .from(staffAttendanceLogs)
    .where(eq(staffAttendanceLogs.date, date));

  const existingSet = new Set(existingLogs.map((l) => l.userId));
  const unmarkedStaff = staffUsers.filter((u) => !existingSet.has(u.id));

  if (unmarkedStaff.length === 0) {
    return { ok: true, message: "All staff members are already marked for today." };
  }


  const now = new Date();
  const insertValues = unmarkedStaff.map((s) => ({
    userId: s.id,
    date,
    status: "PRESENT" as const,
    checkInTime: checkInTime || null,
    recordedById: user.userId,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(staffAttendanceLogs).values(insertValues);

  await writeAuditLog({
    actorId: user.userId,
    action: "STAFF_ATTENDANCE_BATCH_PRESENT",
    entity: "staff_attendance_logs",
    metadata: {
      date,
      count: insertValues.length,
    },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Marked ${insertValues.length} staff member(s) as Present.`,
  };
}

/** Clear or delete a staff attendance record */
export async function clearStaffAttendance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("STAFF_ATTENDANCE_EDIT");

  const parsed = clearStaffAttendanceSchema.safeParse({
    userId: formData.get("userId") ?? undefined,
    date: formData.get("date") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { userId, date } = parsed.data;

  await db
    .delete(staffAttendanceLogs)
    .where(
      and(
        eq(staffAttendanceLogs.userId, userId),
        eq(staffAttendanceLogs.date, date),
      ),
    );

  await writeAuditLog({
    actorId: user.userId,
    action: "STAFF_ATTENDANCE_CLEAR",
    entity: "staff_attendance_logs",
    entityId: userId,
    metadata: { date },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Attendance record cleared." };
}

/** Server-side sick-note / document upload via Firebase Admin */
export async function uploadStaffSickNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("STAFF_ATTENDANCE_RECORD");

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
  const url = await uploadFileToStorage(buffer, file.name, file.type);
  if (!url) {
    return {
      ok: false,
      error: "Document storage is not configured on the server.",
    };
  }
  return { ok: true, url, message: "Document uploaded successfully." };
}
