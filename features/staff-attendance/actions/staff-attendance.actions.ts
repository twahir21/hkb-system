"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, notInArray } from "drizzle-orm";
import { GUARD_ROLES } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { staffAttendanceLogs, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  markStaffAttendanceSchema,
  batchMarkStaffPresentSchema,
  clearStaffAttendanceSchema,
  updateStaffTimesSchema,
  staffSignOutSchema,
} from "@/features/staff-attendance/validators/staff-attendance.schema";
import { uploadFile as uploadFileToStorage } from "@/lib/firebase/firebase-admin";
import { hasPermission } from "@/lib/auth/rbac";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";
import type { Role } from "@/lib/db/schema";

/** Office Assistant may only touch staff of their own branch. Returns an error or null. */
async function outsideBranch(actor: { userId: string; role: Role }, targetUserId: string) {
  const limit = await getStaffBranchLimit(actor.userId, actor.role);
  if (limit === null) return null;
  if (limit === "none") return "Bado huna tawi. Omba IT wakuwekee tawi lako.";
  const target = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
    columns: { branchId: true },
  });
  return target?.branchId === limit ? null : "Mtumishi huyu hayupo kwenye tawi lako.";
}

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
    checkOutTime: formData.get("checkOutTime") || undefined,
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
      error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi",
    };
  }

  const v = parsed.data;

  const branchError = await outsideBranch(user, v.userId);
  if (branchError) return { ok: false, error: branchError };

  // If already logged, editing requires STAFF_ATTENDANCE_EDIT
  const [existing] = await db
    .select({
      id: staffAttendanceLogs.id,
      status: staffAttendanceLogs.status,
      checkInTime: staffAttendanceLogs.checkInTime,
      checkOutTime: staffAttendanceLogs.checkOutTime,
    })
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

  // Only Super Admin may change the recorded times of an existing log.
  const canEditTime = hasPermission(user.role, "STAFF_ATTENDANCE_EDIT_TIME");
  // A missing form key means "don't touch this time" (preserve the stored value).
  const hasCheckInKey = formData.has("checkInTime");
  const hasCheckOutKey = formData.has("checkOutTime");

  await db
    .insert(staffAttendanceLogs)
    .values({
      userId: v.userId,
      date: v.date,
      status: v.status,
      checkInTime: v.checkInTime ?? null,
      checkOutTime: v.checkOutTime ?? null,
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
        absenceCategory: v.absenceCategory ?? null,
        allowedDays: v.allowedDays ?? null,
        minutesLate: v.minutesLate ?? null,
        reason: v.reason ?? null,
        documentUrl: v.documentUrl ?? null,
        recordedById: user.userId,
        updatedAt: new Date(),
        // Times on an existing record may only be changed by Super Admin;
        // every other role keeps the times already recorded.
        ...(canEditTime
          ? {
              checkInTime: hasCheckInKey
                ? v.checkInTime ?? null
                : existing?.checkInTime ?? null,
              checkOutTime: hasCheckOutKey
                ? v.checkOutTime ?? null
                : existing?.checkOutTime ?? null,
            }
          : {}),
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
      checkOutTime: v.checkOutTime,
    },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Mahudhurio ya mtumishi yamerekodiwa." };
}

/** Super Admin only — edit the recorded check-in / sign-out times of an existing log */
export async function updateStaffTimes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("STAFF_ATTENDANCE_EDIT_TIME");

  const parsed = updateStaffTimesSchema.safeParse({
    userId: formData.get("userId") ?? undefined,
    date: formData.get("date") ?? undefined,
    checkInTime: formData.get("checkInTime") ?? undefined,
    checkOutTime: formData.get("checkOutTime") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi",
    };
  }

  const { userId, date, checkInTime, checkOutTime } = parsed.data;

  const [existing] = await db
    .select({ id: staffAttendanceLogs.id })
    .from(staffAttendanceLogs)
    .where(
      and(eq(staffAttendanceLogs.userId, userId), eq(staffAttendanceLogs.date, date)),
    )
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      error:
        "Hakuna rekodi ya mahudhurio ya mtumishi huyu kwa tarehe hii. Mrekodi kwanza Yupo / Amechelewa / Hayupo.",
    };
  }

  await db
    .update(staffAttendanceLogs)
    .set({
      // Empty string = clear the recorded time
      checkInTime: checkInTime?.trim() || null,
      checkOutTime: checkOutTime?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(staffAttendanceLogs.id, existing.id));

  await writeAuditLog({
    actorId: user.userId,
    action: "STAFF_ATTENDANCE_EDIT_TIME",
    entity: "staff_attendance_logs",
    entityId: userId,
    metadata: {
      date,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
    },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Muda wa kuingia / kutoka umesasishwa." };
}

/** Super Admin only — one-click sign-out: stamps the current time as sign-out */
export async function signOutStaff(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("STAFF_ATTENDANCE_EDIT_TIME");

  const parsed = staffSignOutSchema.safeParse({
    userId: formData.get("userId") ?? undefined,
    date: formData.get("date") ?? undefined,
    signOutTime: formData.get("signOutTime") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi",
    };
  }

  const { userId, date } = parsed.data;
  // Prefer the browser-stamped time so the recorded clock matches the user's
  // timezone, exactly like the check-in quick action does.
  const signOutTime =
    parsed.data.signOutTime ||
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const [existing] = await db
    .select({
      id: staffAttendanceLogs.id,
      status: staffAttendanceLogs.status,
      checkOutTime: staffAttendanceLogs.checkOutTime,
    })
    .from(staffAttendanceLogs)
    .where(
      and(eq(staffAttendanceLogs.userId, userId), eq(staffAttendanceLogs.date, date)),
    )
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      error: "Hakuna rekodi ya mahudhurio ya mtumishi huyu kwa tarehe hii.",
    };
  }

  await db
    .update(staffAttendanceLogs)
    .set({ checkOutTime: signOutTime, updatedAt: new Date() })
    .where(eq(staffAttendanceLogs.id, existing.id));

  await writeAuditLog({
    actorId: user.userId,
    action: "STAFF_ATTENDANCE_SIGN_OUT",
    entity: "staff_attendance_logs",
    entityId: userId,
    metadata: {
      date,
      status: existing.status,
      signOutTime,
      previousSignOutTime: existing.checkOutTime,
    },
  });

  revalidatePath("/staff-attendance");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: existing.checkOutTime
      ? `Muda wa kutoka umesasishwa kuwa ${signOutTime}.`
      : `Ametoka saa ${signOutTime}.`,
  };
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
      error: parsed.error.issues[0]?.message ?? "Tarehe si sahihi",
    };
  }

  const { date, checkInTime } = parsed.data;

  // Office Assistant: only their own branch's staff.
  const branchLimit = await getStaffBranchLimit(user.userId, user.role);
  if (branchLimit === "none") {
    return { ok: false, error: "Bado huna tawi. Omba IT wakuwekee tawi lako." };
  }

  // Find all non-guard users
  const staffUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        notInArray(users.role, [...GUARD_ROLES]),
        branchLimit ? eq(users.branchId, branchLimit) : undefined,
      ),
    );

  // Find users already marked on this date
  const existingLogs = await db
    .select({ userId: staffAttendanceLogs.userId })
    .from(staffAttendanceLogs)
    .where(eq(staffAttendanceLogs.date, date));

  const existingSet = new Set(existingLogs.map((l) => l.userId));
  const unmarkedStaff = staffUsers.filter((u) => !existingSet.has(u.id));

  if (unmarkedStaff.length === 0) {
    return { ok: true, message: "Watumishi wote tayari wamerekodiwa leo." };
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
    message: `Watumishi ${insertValues.length} wamerekodiwa kuwa wapo.`,
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
      error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi",
    };
  }

  const { userId, date } = parsed.data;

  const branchError = await outsideBranch(user, userId);
  if (branchError) return { ok: false, error: branchError };

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
  return { ok: true, message: "Rekodi ya mahudhurio imefutwa." };
}

/** Server-side sick-note / document upload via Firebase Admin */
export async function uploadStaffSickNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("STAFF_ATTENDANCE_RECORD");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Hakuna faili lililowekwa." };
  }
  if (!file.type.includes("pdf") && !file.type.includes("image")) {
    return { ok: false, error: "Hati za PDF au picha pekee ndizo zinakubaliwa." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Faili limezidi kikomo cha MB 8." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFileToStorage(buffer, file.name, file.type);
  if (!url) {
    return {
      ok: false,
      error: "Hifadhi ya hati haijawekwa kwenye seva.",
    };
  }
  return { ok: true, url, message: "Hati imepakiwa." };
}
