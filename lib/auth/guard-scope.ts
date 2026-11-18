import "server-only";

import { cache } from "react";
import { eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { guardProfiles, regions, stations, users, type Role } from "@/lib/db/schema";
import { getUserBranch } from "@/features/branches/queries/branches";
import { isOwnBranchOnly, isOwnGuardsOnly, isOwnSiteOnly } from "./roles";

/**
 * Which guards a user may work with (shift sheet, records, reports,
 * dashboard). One place decides it, so pages never test role names.
 * - all:        every guard (HQ office, senior field roles, IT)
 * - supervisor: guards assigned to this supervisor
 * - branch:     guards of one branch (Office Assistant)
 * - stations:   guards posted at the sites this In-Charge leads
 * - none:       no guards (e.g. Office Assistant without a branch)
 */
export type GuardScope =
  | { kind: "all" }
  | { kind: "supervisor"; userId: string }
  | { kind: "branch"; branchId: string }
  | { kind: "stations"; stationIds: string[] }
  | { kind: "none" };

export const getGuardScope = cache(async (userId: string, role: Role): Promise<GuardScope> => {
  if (isOwnGuardsOnly(role)) return { kind: "supervisor", userId };
  if (isOwnBranchOnly(role)) {
    const branch = await getUserBranch(userId);
    return branch ? { kind: "branch", branchId: branch.id } : { kind: "none" };
  }
  if (isOwnSiteOnly(role)) {
    const rows = await db
      .select({ id: stations.id })
      .from(stations)
      .where(eq(stations.inChargeId, userId));
    return rows.length ? { kind: "stations", stationIds: rows.map((r) => r.id) } : { kind: "none" };
  }
  return { kind: "all" };
});

/** True when the guard (a row from listGuards) is inside the scope. */
export function guardInScope(
  g: { assignedSupervisorId: string | null; branchId: string | null; stationId: string | null },
  scope: GuardScope
): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "supervisor":
      return g.assignedSupervisorId === scope.userId;
    case "branch":
      return g.branchId === scope.branchId;
    case "stations":
      return !!g.stationId && scope.stationIds.includes(g.stationId);
    case "none":
      return false;
  }
}

/**
 * Guard profile ids inside the scope (active and disabled), or `null` when
 * the scope is unrestricted. An empty array means "no guards".
 */
export async function getScopedGuardIds(scope: GuardScope): Promise<string[] | null> {
  if (scope.kind === "all") return null;
  if (scope.kind === "none") return [];

  const sup = alias(users, "scope_sup");
  let where: SQL;
  if (scope.kind === "supervisor") {
    where = eq(guardProfiles.assignedSupervisorId, scope.userId);
  } else if (scope.kind === "branch") {
    where = sql`COALESCE(${regions.branchId}, ${sup.branchId}) = ${scope.branchId}`;
  } else {
    where = inArray(guardProfiles.stationId, scope.stationIds);
  }

  const rows = await db
    .select({ id: guardProfiles.id })
    .from(guardProfiles)
    .leftJoin(stations, eq(guardProfiles.stationId, stations.id))
    .leftJoin(regions, eq(stations.regionId, regions.id))
    .leftJoin(sup, eq(guardProfiles.assignedSupervisorId, sup.id))
    .where(where);
  return rows.map((r) => r.id);
}

/** Staff (non-guard) branch limit: own branch id for branch-only roles, else null (no limit). */
export async function getStaffBranchLimit(userId: string, role: Role): Promise<string | null | "none"> {
  if (!isOwnBranchOnly(role)) return null;
  const branch = await getUserBranch(userId);
  return branch ? branch.id : "none";
}
