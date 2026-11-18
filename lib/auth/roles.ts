/**
 * Single source of truth for user roles. Plain module (no DB imports) so it
 * is safe in client components. `lib/db/schema.ts` builds the `user_role`
 * Postgres enum from this list — adding a role here also needs a migration.
 */
export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "SENIOR_SUPERVISOR",
  "OPERATION_OFFICER",
  "SUPERVISOR",
  "IN_CHARGE",
  "HR",
  "BURSAR",
  "STOREKEEPER",
  "SECRETARY",
  "OFFICE_ASSISTANT",
  "GUARD",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];

/**
 * Roles that ARE security guards (have a guard profile, appear on shift
 * sheets, Mpangokazi and guard payroll). In-Charge is a guard who leads
 * the others at a site.
 */
export const GUARD_ROLES = ["GUARD", "IN_CHARGE"] as const satisfies readonly RoleValue[];

export function isGuardRole(role: RoleValue | string | null | undefined): boolean {
  return (GUARD_ROLES as readonly string[]).includes(role ?? "");
}

/**
 * Display order, top → bottom. Field chain of command:
 * Operations Manager (all regions) → Senior Supervisor (one region) →
 * Operations Officer (many sites) → Supervisor (several sites) →
 * In-Charge (leads one site) → Guard. Office: HR, Accountant, Secretary,
 * Office Assistant, Storekeeper. IT runs the system.
 * (The Postgres enum order is fixed; use this list for anything shown.)
 */
export const ROLE_HIERARCHY = [
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "SENIOR_SUPERVISOR",
  "OPERATION_OFFICER",
  "SUPERVISOR",
  "IN_CHARGE",
  "GUARD",
  "HR",
  "BURSAR",
  "SECRETARY",
  "OFFICE_ASSISTANT",
  "STOREKEEPER",
] as const satisfies readonly RoleValue[];
