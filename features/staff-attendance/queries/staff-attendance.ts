import "server-only";

import { and, desc, eq, gte, lte, ne, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  users,
  staffAttendanceLogs,
  type Role,
  type Gender,
  type AttendanceStatus,
  type AbsenceCategory,
} from "@/lib/db/schema";

const recordedBy = alias(users, "recorded_by");

export type StaffMember = {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  role: Role;
  gender: Gender;
  avatarUrl: string | null;
};

export type StaffAttendanceLogDTO = {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  absenceCategory: AbsenceCategory | null;
  allowedDays: number | null;
  minutesLate: number | null;
  reason: string | null;
  documentUrl: string | null;
  recordedById: string;
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StaffSheetRow = StaffMember & {
  log: StaffAttendanceLogDTO | null;
};

/** Get all non-guard staff members */
export async function getStaffMembers(): Promise<StaffMember[]> {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      role: users.role,
      gender: users.gender,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(ne(users.role, "GUARD"))
    .orderBy(users.fullName);

  return rows;
}

/** Get staff attendance sheet for a specific calendar date */
export async function getStaffAttendanceSheet(date: string): Promise<StaffSheetRow[]> {
  const staffList = await getStaffMembers();

  if (staffList.length === 0) {
    return [];
  }

  const logs = await db
    .select({
      id: staffAttendanceLogs.id,
      userId: staffAttendanceLogs.userId,
      date: staffAttendanceLogs.date,
      status: staffAttendanceLogs.status,
      checkInTime: staffAttendanceLogs.checkInTime,
      checkOutTime: staffAttendanceLogs.checkOutTime,
      absenceCategory: staffAttendanceLogs.absenceCategory,
      allowedDays: staffAttendanceLogs.allowedDays,
      minutesLate: staffAttendanceLogs.minutesLate,
      reason: staffAttendanceLogs.reason,
      documentUrl: staffAttendanceLogs.documentUrl,
      recordedById: staffAttendanceLogs.recordedById,
      recordedByName: recordedBy.fullName,
      createdAt: staffAttendanceLogs.createdAt,
      updatedAt: staffAttendanceLogs.updatedAt,
    })
    .from(staffAttendanceLogs)
    .leftJoin(recordedBy, eq(staffAttendanceLogs.recordedById, recordedBy.id))
    .where(eq(staffAttendanceLogs.date, date));

  const logMap = new Map<string, StaffAttendanceLogDTO>();
  for (const l of logs) {
    logMap.set(l.userId, {
      ...l,
      recordedByName: l.recordedByName ?? "System",
    });
  }

  return staffList.map((staff) => ({
    ...staff,
    log: logMap.get(staff.id) ?? null,
  }));
}

export type StaffHistoryRow = StaffAttendanceLogDTO & {
  staffName: string;
  staffEmail: string;
  staffRole: Role;
  staffGender: Gender;
};

/** Query staff attendance history with filters */
export async function listStaffAttendanceLogs(filters: {
  userId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  status?: AttendanceStatus;
  role?: Role;
  limit?: number;
}): Promise<StaffHistoryRow[]> {
  const conds: SQL[] = [];

  if (filters.userId) conds.push(eq(staffAttendanceLogs.userId, filters.userId));
  if (filters.date) conds.push(eq(staffAttendanceLogs.date, filters.date));
  if (filters.fromDate) conds.push(gte(staffAttendanceLogs.date, filters.fromDate));
  if (filters.toDate) conds.push(lte(staffAttendanceLogs.date, filters.toDate));
  if (filters.status) conds.push(eq(staffAttendanceLogs.status, filters.status));
  if (filters.role) conds.push(eq(users.role, filters.role));

  const rows = await db
    .select({
      id: staffAttendanceLogs.id,
      userId: staffAttendanceLogs.userId,
      date: staffAttendanceLogs.date,
      status: staffAttendanceLogs.status,
      checkInTime: staffAttendanceLogs.checkInTime,
      checkOutTime: staffAttendanceLogs.checkOutTime,
      absenceCategory: staffAttendanceLogs.absenceCategory,
      allowedDays: staffAttendanceLogs.allowedDays,
      minutesLate: staffAttendanceLogs.minutesLate,
      reason: staffAttendanceLogs.reason,
      documentUrl: staffAttendanceLogs.documentUrl,
      recordedById: staffAttendanceLogs.recordedById,
      recordedByName: recordedBy.fullName,
      createdAt: staffAttendanceLogs.createdAt,
      updatedAt: staffAttendanceLogs.updatedAt,
      staffName: users.fullName,
      staffEmail: users.email,
      staffRole: users.role,
      staffGender: users.gender,
    })
    .from(staffAttendanceLogs)
    .innerJoin(users, eq(staffAttendanceLogs.userId, users.id))
    .leftJoin(recordedBy, eq(staffAttendanceLogs.recordedById, recordedBy.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(staffAttendanceLogs.date), desc(staffAttendanceLogs.createdAt))
    .limit(filters.limit ?? 1000);

  return rows.map((r) => ({
    ...r,
    recordedByName: r.recordedByName ?? "System",
  }));
}
