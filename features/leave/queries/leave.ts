import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  branches,
  employeeProfiles,
  guardProfiles,
  leaveRequests,
  leaveTypeEnum,
  users,
  type LeaveStatus,
  type LeaveType,
  type Role,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/auth/rbac";
import { getUserBranch } from "@/features/branches/queries/branches";
import { LEAVE_ENTITLEMENT } from "@/features/leave/rules";

export type LeaveScope =
  | { kind: "all" }
  | { kind: "branch"; branchId: string }
  | { kind: "own"; userId: string };

export async function getLeaveScope(user: { userId: string; role: Role }): Promise<LeaveScope> {
  if (hasPermission(user.role, "LEAVE_VIEW_ALL")) return { kind: "all" };
  if (hasPermission(user.role, "LEAVE_VIEW_BRANCH")) {
    const b = await getUserBranch(user.userId);
    if (b) return { kind: "branch", branchId: b.id };
  }
  return { kind: "own", userId: user.userId };
}

const employee = alias(users, "employee");

function scopeWhere(scope: LeaveScope): SQL | undefined {
  if (scope.kind === "all") return undefined;
  if (scope.kind === "branch") return eq(employee.branchId, scope.branchId);
  return eq(leaveRequests.userId, scope.userId);
}

export type LeaveRow = {
  id: string;
  userId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  filedByName: string;
  reviewedByName: string | null;
  reviewNotes: string | null;
  createdAt: Date;
};

export async function listLeaveRequests(scope: LeaveScope, status?: LeaveStatus): Promise<LeaveRow[]> {
  const filer = alias(users, "filer");
  const reviewer = alias(users, "reviewer");
  return db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      employeeName: employee.fullName,
      type: leaveRequests.type,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      filedByName: filer.fullName,
      reviewedByName: reviewer.fullName,
      reviewNotes: leaveRequests.reviewNotes,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .innerJoin(employee, eq(leaveRequests.userId, employee.id))
    .innerJoin(filer, eq(leaveRequests.requestedById, filer.id))
    .leftJoin(reviewer, eq(leaveRequests.reviewedById, reviewer.id))
    .where(and(scopeWhere(scope), status ? eq(leaveRequests.status, status) : undefined))
    .orderBy(sql`${leaveRequests.status} = 'PENDING' DESC`, desc(leaveRequests.startDate))
    .limit(300);
}

/** Can this scope see / file for this employee? */
export async function employeeInScope(scope: LeaveScope, userId: string) {
  if (scope.kind === "all") return true;
  if (scope.kind === "own") return scope.userId === userId;
  const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { branchId: true } });
  return row?.branchId === scope.branchId;
}

/** Employees the user may file leave for. */
export async function listLeaveEmployees(scope: LeaveScope) {
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(
      scope.kind === "all"
        ? undefined
        : scope.kind === "branch"
          ? eq(users.branchId, scope.branchId)
          : eq(users.id, scope.userId)
    )
    .orderBy(asc(users.fullName));
}

export type LeaveBalance = { type: LeaveType; entitled: number | null; used: number; left: number | null };

/** Approved + pending days used this calendar year, per leave type. */
export async function getLeaveBalance(userId: string, year = new Date().getFullYear()): Promise<LeaveBalance[]> {
  const rows = await db
    .select({ type: leaveRequests.type, used: sql<number>`COALESCE(SUM(${leaveRequests.days}), 0)` })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        inArray(leaveRequests.status, ["APPROVED", "PENDING"]),
        gte(leaveRequests.startDate, `${year}-01-01`),
        lte(leaveRequests.startDate, `${year}-12-31`)
      )
    )
    .groupBy(leaveRequests.type);
  return leaveTypeEnum.enumValues.map((type) => {
    const used = Number(rows.find((r) => r.type === type)?.used ?? 0);
    const entitled = LEAVE_ENTITLEMENT[type];
    return { type, entitled, used, left: entitled === null ? null : entitled - used };
  });
}

/** True when an overlapping APPROVED/PENDING request exists. */
export async function hasOverlappingLeave(userId: string, start: string, end: string, excludeId?: string) {
  const [row] = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.userId, userId),
        inArray(leaveRequests.status, ["APPROVED", "PENDING"]),
        lte(leaveRequests.startDate, end),
        gte(leaveRequests.endDate, start),
        excludeId ? ne(leaveRequests.id, excludeId) : undefined
      )
    )
    .limit(1);
  return Boolean(row);
}

/** Approved leave covering a date, by user id (for Mpangokazi / shift sheet). */
export async function getApprovedLeaveOn(userIds: string[], date: string) {
  if (userIds.length === 0) return new Map<string, LeaveType>();
  const rows = await db
    .select({ userId: leaveRequests.userId, type: leaveRequests.type })
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.userId, userIds),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, date),
        gte(leaveRequests.endDate, date)
      )
    );
  return new Map(rows.map((r) => [r.userId, r.type]));
}

export type LeaveCalendarEntry = {
  id: string;
  userId: string;
  employeeName: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
};

/** Approved + pending leave overlapping a month (YYYY-MM), inside the scope. */
export async function listLeaveForMonth(scope: LeaveScope, month: string): Promise<LeaveCalendarEntry[]> {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  return db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      employeeName: employee.fullName,
      type: leaveRequests.type,
      status: leaveRequests.status,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
    })
    .from(leaveRequests)
    .innerJoin(employee, eq(leaveRequests.userId, employee.id))
    .where(
      and(
        scopeWhere(scope),
        inArray(leaveRequests.status, ["APPROVED", "PENDING"]),
        lte(leaveRequests.startDate, last),
        gte(leaveRequests.endDate, first)
      )
    )
    .orderBy(asc(leaveRequests.startDate), asc(employee.fullName));
}

export type LeaveLetterData = {
  id: string;
  userId: string;
  employeeName: string;
  employeeNo: string | null;
  jobTitle: string | null;
  branchName: string | null;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
};

/** One leave request with what the approval letter needs, inside the scope. */
export async function getLeaveForLetter(scope: LeaveScope, id: string): Promise<LeaveLetterData | null> {
  const reviewer = alias(users, "reviewer");
  const [row] = await db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      employeeName: employee.fullName,
      staffNo: employeeProfiles.employeeNo,
      guardNo: guardProfiles.employeeId,
      jobTitle: employeeProfiles.jobTitle,
      branchName: branches.name,
      type: leaveRequests.type,
      status: leaveRequests.status,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      days: leaveRequests.days,
      reason: leaveRequests.reason,
      reviewedByName: reviewer.fullName,
      reviewedAt: leaveRequests.reviewedAt,
      reviewNotes: leaveRequests.reviewNotes,
    })
    .from(leaveRequests)
    .innerJoin(employee, eq(leaveRequests.userId, employee.id))
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, employee.id))
    .leftJoin(guardProfiles, eq(guardProfiles.userId, employee.id))
    .leftJoin(branches, eq(employee.branchId, branches.id))
    .leftJoin(reviewer, eq(leaveRequests.reviewedById, reviewer.id))
    .where(and(eq(leaveRequests.id, id), scopeWhere(scope)))
    .limit(1);
  if (!row) return null;
  const { staffNo, guardNo, ...rest } = row;
  return { ...rest, employeeNo: staffNo ?? guardNo ?? null, jobTitle: rest.jobTitle ?? (guardNo ? "Mlinzi" : null) };
}
