import "server-only";

import { and, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { attendanceLogs, guardProfiles, leaveRequests, users, type LeaveType } from "@/lib/db/schema";
import { listGuards, type GuardRow } from "@/features/hr/queries/guards";
import { guardInScope, type GuardScope } from "@/lib/auth/guard-scope";

const supervisor = alias(users, "supervisor");

export type ShiftLeave = { type: LeaveType; startDate: string; endDate: string };

export type ShiftSheetRow = GuardRow & {
  log: typeof attendanceLogs.$inferSelect | null;
  /** Approved leave covering the sheet date, if any. */
  leave: ShiftLeave | null;
};

export async function getShiftSheet(
  date: string,
  shift: "DAY" | "NIGHT",
  scope: GuardScope,
  supervisorId?: string,
  includePii = false,
): Promise<ShiftSheetRow[]> {
  const guards = await listGuards(includePii);
  const scoped = guards.filter(
    (g) =>
      guardInScope(g, scope) &&
      (!supervisorId || g.assignedSupervisorId === supervisorId),
  );

  const logRows = scoped.length
    ? await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.date, date),
            eq(attendanceLogs.shift, shift),
            inArray(
              attendanceLogs.guardId,
              scoped.map((g) => g.id),
            ),
          ),
        )
    : [];

  const leaveRows = scoped.length
    ? await db
        .select({
          userId: leaveRequests.userId,
          type: leaveRequests.type,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
        })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.status, "APPROVED"),
            lte(leaveRequests.startDate, date),
            gte(leaveRequests.endDate, date),
            inArray(
              leaveRequests.userId,
              scoped.map((g) => g.userId),
            ),
          ),
        )
    : [];

  const logMap = new Map(logRows.map((l) => [l.guardId, l]));
  const leaveMap = new Map(
    leaveRows.map((l) => [l.userId, { type: l.type, startDate: l.startDate, endDate: l.endDate }]),
  );
  return scoped.map((g) => ({
    ...g,
    log: logMap.get(g.id) ?? null,
    leave: leaveMap.get(g.userId) ?? null,
  }));
}

export type LogRow = {
  id: string;
  date: string;
  shift: "DAY" | "NIGHT";
  status: "PRESENT" | "ABSENT" | "LATE";
  absenceCategory: (typeof attendanceLogs.$inferSelect)["absenceCategory"];
  allowedDays: number | null;
  minutesLate: number | null;
  reason: string | null;
  documentUrl: string | null;
  guardName: string;
  employeeId: string;
  supervisorName: string;
};

export async function listLogs(filters: {
  date?: string;
  fromDate?: string;
  toDate?: string;
  shift?: "DAY" | "NIGHT";
  status?: "PRESENT" | "ABSENT" | "LATE";
  supervisorId?: string;
  guardId?: string;
  /** Limit to these guards. null/undefined = no limit; [] = no rows. */
  guardIds?: string[] | null;
  limit?: number;
}): Promise<LogRow[]> {
  if (filters.guardIds && filters.guardIds.length === 0) return [];
  const conds: SQL[] = [];
  if (filters.date) conds.push(eq(attendanceLogs.date, filters.date));
  if (filters.fromDate) conds.push(gte(attendanceLogs.date, filters.fromDate));
  if (filters.toDate) conds.push(lte(attendanceLogs.date, filters.toDate));
  if (filters.shift) conds.push(eq(attendanceLogs.shift, filters.shift));
  if (filters.status) conds.push(eq(attendanceLogs.status, filters.status));
  if (filters.supervisorId)
    conds.push(eq(attendanceLogs.supervisorId, filters.supervisorId));
  if (filters.guardId) conds.push(eq(attendanceLogs.guardId, filters.guardId));
  if (filters.guardIds?.length)
    conds.push(inArray(attendanceLogs.guardId, filters.guardIds));

  const rows = await db
    .select({
      log: attendanceLogs,
      guardName: users.fullName,
      employeeId: guardProfiles.employeeId,
      supervisorName: sql<string>`${supervisor.fullName}`.as("supervisor_name"),
    })
    .from(attendanceLogs)
    .innerJoin(guardProfiles, eq(attendanceLogs.guardId, guardProfiles.id))
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(supervisor, eq(attendanceLogs.supervisorId, supervisor.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(attendanceLogs.date))
    .limit(filters.limit ?? 500);

  return rows.map((r) => ({
    id: r.log.id,
    date: r.log.date,
    shift: r.log.shift,
    status: r.log.status,
    absenceCategory: r.log.absenceCategory,
    allowedDays: r.log.allowedDays,
    minutesLate: r.log.minutesLate,
    reason: r.log.reason,
    documentUrl: r.log.documentUrl,
    guardName: r.guardName,
    employeeId: r.employeeId,
    supervisorName: r.supervisorName ?? "",
  }));
}
