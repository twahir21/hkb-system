import "server-only";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { guardProfiles, clients, regions, stations, users, type Gender } from "@/lib/db/schema";

export type GuardRow = {
  id: string;
  userId: string;
  employeeId: string;
  gender: Gender;
  age: number;
  phone: string;
  homeLocation: string;
  workLocation: string;
  stationId: string | null;
  regionName: string | null;
  clientId: string | null;
  clientName: string | null;
  kinName: string;
  kinRelation: string;
  kinPhone: string;
  registrationDate: string;
  assignedSupervisorId: string | null;
  supervisorName: string | null;
  email: string;
  fullName: string;
  /** false = the guard has been disabled and is no longer counted as a guard. */
  isActive: boolean;
  disabledAt: Date | null;
  createdAt: Date;
};

const supervisor = alias(users, "supervisor");

export type ListGuardsOptions = {
  /**
   * Include disabled guards. Defaults to false so operational views (shift
   * sheet, dashboards, analytics, transfers, credit) only ever see guards who
   * are currently counted as guards. Only the Guard Registry and the payroll
   * export opt in.
   */
  includeDisabled?: boolean;
};

export async function listGuards(
  includePii = false,
  options: ListGuardsOptions = {},
): Promise<GuardRow[]> {
  const rows = await db
    .select({
      guard: guardProfiles,
      email: users.email,
      fullName: users.fullName,
      supervisorName: sql<string | null>`${supervisor.fullName}`.as("supervisor_name"),
      regionName: sql<string | null>`${regions.name}`.as("region_name"),
      clientName: sql<string | null>`${clients.name}`.as("client_name"),
    })
    .from(guardProfiles)
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(stations, eq(guardProfiles.stationId, stations.id))
    .leftJoin(regions, eq(stations.regionId, regions.id))
    .leftJoin(clients, eq(guardProfiles.clientId, clients.id))
    .leftJoin(
      supervisor,
      eq(guardProfiles.assignedSupervisorId, supervisor.id)
    )
    .where(options.includeDisabled ? undefined : eq(guardProfiles.isActive, true))
    // Active guards first, then newest registrations.
    .orderBy(desc(guardProfiles.isActive), desc(guardProfiles.createdAt));

  return rows.map((r) => ({
    id: r.guard.id,
    userId: r.guard.userId,
    employeeId: r.guard.employeeId,
    gender: r.guard.gender,
    age: r.guard.age,
    phone: includePii ? r.guard.phone : "",
    homeLocation: includePii ? r.guard.homeLocation : "",
    workLocation: r.guard.workLocation,
    stationId: r.guard.stationId,
    regionName: r.regionName ?? null,
    clientId: r.guard.clientId,
    clientName: r.clientName ?? null,
    kinName: includePii ? r.guard.kinName : "",
    kinRelation: includePii ? r.guard.kinRelation : "",
    kinPhone: includePii ? r.guard.kinPhone : "",
    registrationDate: r.guard.registrationDate,
    assignedSupervisorId: r.guard.assignedSupervisorId,
    supervisorName: r.supervisorName ?? null,
    email: includePii ? r.email : "",
    fullName: r.fullName,
    isActive: r.guard.isActive,
    disabledAt: r.guard.disabledAt,
    createdAt: r.guard.createdAt,
  }));
}

/** `YYYY-MM-DD` for a timestamp, compared against attendance `date` columns. */
function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Guards that a *period* report must still include: everyone currently active
 * plus anyone disabled on/after the period start (they may have worked part of
 * the period, so payroll must still see them). Guards disabled before the
 * period began are excluded — they were never counted during that window.
 */
export function guardsInPeriod(guards: GuardRow[], fromDate: string): GuardRow[] {
  return guards.filter(
    (g) => g.isActive || !g.disabledAt || isoDay(g.disabledAt) >= fromDate,
  );
}

export async function getGuardByUserId(userId: string) {
  return db.query.guardProfiles.findFirst({
    where: eq(guardProfiles.userId, userId),
  });
}

export async function getSupervisors() {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(
      inArray(users.role, [
        "SUPERVISOR",
        "OPERATION_OFFICER",
        "SENIOR_SUPERVISOR",
        "SUPER_ADMIN",
      ])
    )
    .orderBy(users.fullName);
}

export async function getSupervisorIdForGuard(guardId: string) {
  const row = await db.query.guardProfiles.findFirst({
    where: eq(guardProfiles.id, guardId),
    columns: { assignedSupervisorId: true },
  });
  return row?.assignedSupervisorId ?? null;
}