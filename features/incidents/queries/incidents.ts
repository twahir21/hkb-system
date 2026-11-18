import "server-only";

import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  branches,
  clients,
  incidentActions,
  incidents,
  regions,
  stations,
  users,
  type IncidentLevel,
  type IncidentStatus,
  type Role,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/auth/rbac";
import { getUserBranch } from "@/features/branches/queries/branches";

/**
 * Who can see / act on which incidents:
 * - all:    every branch (SUPER_ADMIN, OPERATIONS_MANAGER) — can act
 * - branch: own branch only (OFFICE_ASSISTANT) — can act
 * - own:    only incidents the user reported — read only
 * - none:   no access
 */
export type IncidentScope =
  | { kind: "all"; canAct: true }
  | { kind: "branch"; branchId: string; canAct: true }
  | { kind: "own"; userId: string; canAct: false }
  | { kind: "none"; canAct: false };

export async function getIncidentScope(user: { userId: string; role: Role }): Promise<IncidentScope> {
  if (hasPermission(user.role, "INCIDENT_MANAGE_ALL")) return { kind: "all", canAct: true };
  if (hasPermission(user.role, "INCIDENT_MANAGE_BRANCH")) {
    const branch = await getUserBranch(user.userId);
    // No branch assigned → fall back to own reports, never all branches.
    if (branch) return { kind: "branch", branchId: branch.id, canAct: true };
    return { kind: "own", userId: user.userId, canAct: false };
  }
  if (hasPermission(user.role, "INCIDENT_REPORT")) {
    return { kind: "own", userId: user.userId, canAct: false };
  }
  return { kind: "none", canAct: false };
}

function scopeWhere(scope: IncidentScope): SQL | undefined {
  switch (scope.kind) {
    case "all":
      return undefined;
    case "branch":
      return eq(incidents.branchId, scope.branchId);
    case "own":
      return eq(incidents.reportedById, scope.userId);
    case "none":
      return eq(incidents.id, "00000000-0000-0000-0000-000000000000");
  }
}

/** True when the incident falls inside the scope and the scope may act on it. */
export async function canActOnIncident(scope: IncidentScope, incidentId: string) {
  if (!scope.canAct) return false;
  const [row] = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), scopeWhere(scope)))
    .limit(1);
  return Boolean(row);
}

export type IncidentActionRow = {
  id: string;
  note: string;
  actorName: string;
  createdAt: Date;
};

export type IncidentRow = {
  id: string;
  title: string;
  description: string;
  level: IncidentLevel;
  status: IncidentStatus;
  occurredAt: Date;
  createdAt: Date;
  stationName: string | null;
  regionName: string | null;
  clientName: string | null;
  branchName: string | null;
  reportedByName: string;
  resolvedByName: string | null;
  resolvedAt: Date | null;
  actions: IncidentActionRow[];
};

export type IncidentFilters = {
  status?: IncidentStatus;
  level?: IncidentLevel;
  branchId?: string;
};

export async function listIncidents(
  scope: IncidentScope,
  filters: IncidentFilters = {},
  limit = 200
): Promise<IncidentRow[]> {
  const reporter = alias(users, "reporter");
  const resolver = alias(users, "resolver");

  const rows = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      description: incidents.description,
      level: incidents.level,
      status: incidents.status,
      occurredAt: incidents.occurredAt,
      createdAt: incidents.createdAt,
      stationName: stations.name,
      regionName: regions.name,
      clientName: clients.name,
      branchName: branches.name,
      reportedByName: reporter.fullName,
      resolvedByName: resolver.fullName,
      resolvedAt: incidents.resolvedAt,
    })
    .from(incidents)
    .innerJoin(reporter, eq(incidents.reportedById, reporter.id))
    .leftJoin(resolver, eq(incidents.resolvedById, resolver.id))
    .leftJoin(stations, eq(incidents.stationId, stations.id))
    .leftJoin(regions, eq(stations.regionId, regions.id))
    .leftJoin(clients, eq(incidents.clientId, clients.id))
    .leftJoin(branches, eq(incidents.branchId, branches.id))
    .where(
      and(
        scopeWhere(scope),
        filters.status ? eq(incidents.status, filters.status) : undefined,
        filters.level ? eq(incidents.level, filters.level) : undefined,
        filters.branchId && scope.kind === "all" ? eq(incidents.branchId, filters.branchId) : undefined
      )
    )
    .orderBy(desc(incidents.occurredAt))
    .limit(limit);

  const ids = rows.map((r) => r.id);
  const actionRows = ids.length
    ? await db
        .select({
          id: incidentActions.id,
          incidentId: incidentActions.incidentId,
          note: incidentActions.note,
          actorName: users.fullName,
          createdAt: incidentActions.createdAt,
        })
        .from(incidentActions)
        .innerJoin(users, eq(incidentActions.actorId, users.id))
        .where(inArray(incidentActions.incidentId, ids))
        .orderBy(asc(incidentActions.createdAt))
    : [];

  return rows.map((r) => ({
    ...r,
    actions: actionRows
      .filter((a) => a.incidentId === r.id)
      .map((a) => ({ id: a.id, note: a.note, actorName: a.actorName, createdAt: a.createdAt })),
  }));
}

/** Open incident counts for the dashboard (inside the user's scope). */
export async function getOpenIncidentCounts(scope: IncidentScope) {
  const rows = await db
    .select({ level: incidents.level })
    .from(incidents)
    .where(and(scopeWhere(scope), eq(incidents.status, "OPEN")));
  return {
    open: rows.length,
    critical: rows.filter((r) => r.level === "CRITICAL" || r.level === "HIGH").length,
  };
}

export type SiteOption = {
  id: string;
  name: string;
  regionName: string;
  branchId: string | null;
};

/**
 * Sites (stations) a user may report on. Branch-scoped users only get sites
 * in their own branch; everyone else gets every site.
 */
export async function listSitesForScope(scope: IncidentScope): Promise<SiteOption[]> {
  const branchId = scope.kind === "branch" ? scope.branchId : null;
  const rows = await db
    .select({
      id: stations.id,
      name: stations.name,
      regionName: regions.name,
      branchId: regions.branchId,
    })
    .from(stations)
    .innerJoin(regions, eq(stations.regionId, regions.id))
    .where(branchId ? eq(regions.branchId, branchId) : undefined)
    .orderBy(asc(regions.name), asc(stations.name));
  return rows;
}
