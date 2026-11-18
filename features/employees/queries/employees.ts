import "server-only";

import { and, asc, desc, eq, inArray, lte, notInArray, sql } from "drizzle-orm";
import { GUARD_ROLES, isGuardRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  branches,
  contracts,
  employeeProfiles,
  guardProfiles,
  users,
  type ContractStatus,
  type ContractType,
  type Department,
  type Role,
} from "@/lib/db/schema";

export type EmployeeRow = {
  userId: string;
  fullName: string;
  role: Role;
  branchName: string | null;
  department: Department | null;
  jobTitle: string | null;
  phone: string | null;
  employeeNo: string | null;
  contractEnd: string | null; // earliest end of an ACTIVE contract
  hasActiveContract: boolean;
};

/** Staff (group "staff") or guards (group "guards") with HR summary. */
export async function listEmployees(group: "staff" | "guards"): Promise<EmployeeRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      role: users.role,
      branchName: branches.name,
      department: employeeProfiles.department,
      jobTitle: employeeProfiles.jobTitle,
      phone: sql<string | null>`COALESCE(${employeeProfiles.phone}, ${guardProfiles.phone})`,
      employeeNo: sql<string | null>`COALESCE(${employeeProfiles.employeeNo}, ${guardProfiles.employeeId})`,
    })
    .from(users)
    .leftJoin(branches, eq(users.branchId, branches.id))
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .leftJoin(guardProfiles, eq(guardProfiles.userId, users.id))
    .where(group === "guards" ? inArray(users.role, [...GUARD_ROLES]) : notInArray(users.role, [...GUARD_ROLES]))
    .orderBy(asc(users.fullName));

  const ids = rows.map((r) => r.userId);
  const active = ids.length
    ? await db
        .select({ userId: contracts.userId, endDate: contracts.endDate })
        .from(contracts)
        .where(and(eq(contracts.status, "ACTIVE"), inArray(contracts.userId, ids)))
    : [];

  return rows.map((r) => {
    const mine = active.filter((c) => c.userId === r.userId);
    const ends = mine.map((c) => c.endDate).filter((d): d is string => Boolean(d)).sort();
    return {
      ...r,
      department: r.department ?? (isGuardRole(r.role) ? "SECURITY" : null),
      jobTitle: r.jobTitle ?? null,
      contractEnd: ends[0] ?? null,
      hasActiveContract: mine.length > 0,
    };
  });
}

export async function getEmployee(userId: string) {
  const [row] = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      branchName: branches.name,
      profile: employeeProfiles,
      guardEmployeeId: guardProfiles.employeeId,
    })
    .from(users)
    .leftJoin(branches, eq(users.branchId, branches.id))
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .leftJoin(guardProfiles, eq(guardProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export type ContractRow = {
  id: string;
  type: ContractType;
  status: ContractStatus;
  position: string;
  startDate: string;
  endDate: string | null;
  monthlySalary: string | null;
  hasDocument: boolean;
  notes: string | null;
};

export async function listContracts(userId: string): Promise<ContractRow[]> {
  const rows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.userId, userId))
    .orderBy(desc(contracts.startDate));
  return rows.map((c) => ({
    id: c.id,
    type: c.type,
    status: c.status,
    position: c.position,
    startDate: c.startDate,
    endDate: c.endDate,
    monthlySalary: c.monthlySalary,
    hasDocument: Boolean(c.documentUrl),
    notes: c.notes,
  }));
}

export type ExpiringContract = {
  id: string;
  userId: string;
  fullName: string;
  role: Role;
  position: string;
  endDate: string;
  daysLeft: number;
};

/** Active contracts ending within `days` days (or already past their end). */
export async function listExpiringContracts(days = 60): Promise<ExpiringContract[]> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });
  const limit = new Date(Date.parse(today) + days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: contracts.id,
      userId: users.id,
      fullName: users.fullName,
      role: users.role,
      position: contracts.position,
      endDate: contracts.endDate,
    })
    .from(contracts)
    .innerJoin(users, eq(contracts.userId, users.id))
    .where(and(eq(contracts.status, "ACTIVE"), lte(contracts.endDate, limit)))
    .orderBy(asc(contracts.endDate));
  return rows
    .filter((r): r is typeof r & { endDate: string } => Boolean(r.endDate))
    .map((r) => ({
      ...r,
      daysLeft: Math.round((Date.parse(r.endDate) - Date.parse(today)) / 86_400_000),
    }));
}
