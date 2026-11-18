import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  attendanceLogs,
  branches,
  guardProfiles,
  regions,
  stations,
  users,
  workPlanEntries,
  workPlans,
  type Role,
  type WorkPlanStatus,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/auth/rbac";
import { getUserBranch } from "@/features/branches/queries/branches";
import { getApprovedLeaveOn } from "@/features/leave/queries/leave";

export type ScopeGuard = {
  guardId: string;
  guardName: string;
  employeeId: string;
  point: string;
  status: WorkPlanStatus;
};

/**
 * Guards the preparer reports on, with today's status pre-filled from the
 * Shift Sheet. Supervisors: own assigned guards. Branch-wide roles: every
 * active guard whose site (or supervisor) belongs to the branch.
 */
export async function getScopeGuards(opts: {
  userId: string;
  branchWide: boolean;
  branchId: string | null;
  date: string;
}): Promise<ScopeGuard[]> {
  const sup = alias(users, "sup");
  const guardUser = alias(users, "guard_user");
  // A guard's branch: site's region branch, else the assigned supervisor's branch.
  const guardBranch = sql<string | null>`COALESCE(${regions.branchId}, ${sup.branchId})`;

  let where: SQL | undefined;
  if (!opts.branchWide) {
    where = eq(guardProfiles.assignedSupervisorId, opts.userId);
  } else if (opts.branchId) {
    where = sql`${guardBranch} = ${opts.branchId}`;
  }

  const guards = await db
    .select({
      guardId: guardProfiles.id,
      userId: guardProfiles.userId,
      guardName: guardUser.fullName,
      employeeId: guardProfiles.employeeId,
      stationName: stations.name,
      workLocation: guardProfiles.workLocation,
    })
    .from(guardProfiles)
    .innerJoin(guardUser, eq(guardProfiles.userId, guardUser.id))
    .leftJoin(stations, eq(guardProfiles.stationId, stations.id))
    .leftJoin(regions, eq(stations.regionId, regions.id))
    .leftJoin(sup, eq(guardProfiles.assignedSupervisorId, sup.id))
    .where(and(eq(guardProfiles.isActive, true), where))
    .orderBy(asc(stations.name), asc(guardUser.fullName));

  if (guards.length === 0) return [];

  const logs = await db
    .select({
      guardId: attendanceLogs.guardId,
      status: attendanceLogs.status,
      absenceCategory: attendanceLogs.absenceCategory,
    })
    .from(attendanceLogs)
    .where(
      and(
        eq(attendanceLogs.date, opts.date),
        inArray(
          attendanceLogs.guardId,
          guards.map((g) => g.guardId)
        )
      )
    );

  const onLeave = await getApprovedLeaveOn(
    guards.map((g) => g.userId),
    opts.date
  );

  // Any shift present → present. Otherwise the absence category decides.
  // No record: approved leave → Ruhusa / Mgonjwa, else Off.
  const statusOf = (guardId: string, userId: string): WorkPlanStatus => {
    const mine = logs.filter((l) => l.guardId === guardId);
    if (mine.length === 0) {
      const leave = onLeave.get(userId);
      if (leave === "SICK") return "SICK";
      if (leave) return "PERMITTED";
      return "OFF";
    }
    if (mine.some((l) => l.status === "PRESENT" || l.status === "LATE")) return "PRESENT";
    const cat = mine[0].absenceCategory;
    if (cat === "SICK") return "SICK";
    if (cat === "PERMITTED_REASON") return "PERMITTED";
    return "ABSENT";
  };

  return guards.map((g) => ({
    guardId: g.guardId,
    guardName: g.guardName,
    employeeId: g.employeeId,
    point: g.stationName ?? g.workLocation,
    status: statusOf(g.guardId, g.userId),
  }));
}

/** Who can read which reports. */
export type WorkPlanViewScope =
  | { kind: "all" }
  | { kind: "branch"; branchId: string }
  | { kind: "own"; userId: string }
  | { kind: "none" };

export async function getWorkPlanViewScope(user: { userId: string; role: Role }): Promise<WorkPlanViewScope> {
  if (hasPermission(user.role, "MPANGOKAZI_VIEW_ALL")) return { kind: "all" };
  if (hasPermission(user.role, "MPANGOKAZI_VIEW_BRANCH")) {
    const b = await getUserBranch(user.userId);
    return b ? { kind: "branch", branchId: b.id } : { kind: "none" };
  }
  if (hasPermission(user.role, "MPANGOKAZI_SUBMIT")) return { kind: "own", userId: user.userId };
  return { kind: "none" };
}

function viewWhere(scope: WorkPlanViewScope): SQL | undefined {
  switch (scope.kind) {
    case "all":
      return undefined;
    case "branch":
      return eq(workPlans.branchId, scope.branchId);
    case "own":
      return eq(workPlans.preparedById, scope.userId);
    case "none":
      return sql`false`;
  }
}

export type WorkPlanSummary = {
  id: string;
  date: string;
  branchName: string | null;
  preparedByName: string;
  jobPosition: string;
  totalGuards: number;
  presentCount: number;
  offCount: number;
  permittedCount: number;
  sickCount: number;
  absentCount: number;
  updatedAt: Date;
};

export async function listWorkPlans(
  scope: WorkPlanViewScope,
  filters: { date?: string; branchId?: string } = {}
): Promise<WorkPlanSummary[]> {
  return db
    .select({
      id: workPlans.id,
      date: workPlans.date,
      branchName: branches.name,
      preparedByName: workPlans.preparedByName,
      jobPosition: workPlans.jobPosition,
      totalGuards: workPlans.totalGuards,
      presentCount: workPlans.presentCount,
      offCount: workPlans.offCount,
      permittedCount: workPlans.permittedCount,
      sickCount: workPlans.sickCount,
      absentCount: workPlans.absentCount,
      updatedAt: workPlans.updatedAt,
    })
    .from(workPlans)
    .leftJoin(branches, eq(workPlans.branchId, branches.id))
    .where(
      and(
        viewWhere(scope),
        filters.date ? eq(workPlans.date, filters.date) : undefined,
        filters.branchId ? eq(workPlans.branchId, filters.branchId) : undefined
      )
    )
    .orderBy(desc(workPlans.date), asc(branches.name))
    .limit(300);
}

export async function getWorkPlan(scope: WorkPlanViewScope, id: string) {
  const [plan] = await db
    .select({
      id: workPlans.id,
      date: workPlans.date,
      branchName: branches.name,
      preparedByName: workPlans.preparedByName,
      jobPosition: workPlans.jobPosition,
      signatureDataUrl: workPlans.signatureDataUrl,
      totalGuards: workPlans.totalGuards,
      presentCount: workPlans.presentCount,
      offCount: workPlans.offCount,
      permittedCount: workPlans.permittedCount,
      sickCount: workPlans.sickCount,
      absentCount: workPlans.absentCount,
      notes: workPlans.notes,
      updatedAt: workPlans.updatedAt,
    })
    .from(workPlans)
    .leftJoin(branches, eq(workPlans.branchId, branches.id))
    .where(and(eq(workPlans.id, id), viewWhere(scope)))
    .limit(1);
  if (!plan) return null;

  const entries = await db
    .select({
      position: workPlanEntries.position,
      guardId: workPlanEntries.guardId,
      guardName: workPlanEntries.guardName,
      point: workPlanEntries.point,
      status: workPlanEntries.status,
    })
    .from(workPlanEntries)
    .where(eq(workPlanEntries.workPlanId, id))
    .orderBy(asc(workPlanEntries.position));

  return { ...plan, entries };
}

export type WorkPlanDetail = NonNullable<Awaited<ReturnType<typeof getWorkPlan>>>;

/** The preparer's existing report for a date (to edit instead of duplicating). */
export async function findOwnWorkPlan(userId: string, date: string) {
  const row = await db.query.workPlans.findFirst({
    where: and(eq(workPlans.preparedById, userId), eq(workPlans.date, date)),
    columns: { id: true },
  });
  return row?.id ?? null;
}
