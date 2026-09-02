import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { guardProfiles, users } from "@/lib/db/schema";

export type GuardRow = {
  id: string;
  userId: string;
  employeeId: string;
  age: number;
  phone: string;
  homeLocation: string;
  workLocation: string;
  kinName: string;
  kinRelation: string;
  kinPhone: string;
  registrationDate: string;
  assignedSupervisorId: string | null;
  supervisorName: string | null;
  email: string;
  fullName: string;
  createdAt: Date;
};

const supervisor = alias(users, "supervisor");

export async function listGuards(includePii = false): Promise<GuardRow[]> {
  const rows = await db
    .select({
      guard: guardProfiles,
      email: users.email,
      fullName: users.fullName,
      supervisorName: sql<string | null>`${supervisor.fullName}`.as("supervisor_name"),
    })
    .from(guardProfiles)
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(
      supervisor,
      and(
        eq(guardProfiles.assignedSupervisorId, supervisor.id),
        eq(supervisor.role, "SUPERVISOR")
      )
    )
    .orderBy(desc(guardProfiles.createdAt));

  return rows.map((r) => ({
    id: r.guard.id,
    userId: r.guard.userId,
    employeeId: r.guard.employeeId,
    age: r.guard.age,
    phone: includePii ? r.guard.phone : "",
    homeLocation: includePii ? r.guard.homeLocation : "",
    workLocation: r.guard.workLocation,
    kinName: includePii ? r.guard.kinName : "",
    kinRelation: includePii ? r.guard.kinRelation : "",
    kinPhone: includePii ? r.guard.kinPhone : "",
    registrationDate: r.guard.registrationDate,
    assignedSupervisorId: r.guard.assignedSupervisorId,
    supervisorName: r.supervisorName ?? null,
    email: includePii ? r.email : "",
    fullName: r.fullName,
    createdAt: r.guard.createdAt,
  }));
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
    .where(inArray(users.role, ["SUPERVISOR", "SENIOR_SUPERVISOR", "SUPER_ADMIN"]))
    .orderBy(users.fullName);
}

export async function getSupervisorIdForGuard(guardId: string) {
  const row = await db.query.guardProfiles.findFirst({
    where: eq(guardProfiles.id, guardId),
    columns: { assignedSupervisorId: true },
  });
  return row?.assignedSupervisorId ?? null;
}