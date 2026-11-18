/**
 * Single source of truth for user roles. Plain module (no DB imports) so it
 * is safe in client components. `lib/db/schema.ts` builds the `user_role`
 * Postgres enum from this list — adding a role here also needs a migration.
 */
export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "CEO",
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
  "IT_SUPERVISOR",
  "SECRETARY_SUPERVISOR",
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
 * Display order, top → bottom. CEO heads the company. Field chain of command:
 * Operations Manager (all regions) → Senior Supervisor (one region) →
 * Operations Officer (many sites) → Supervisor (several sites) →
 * In-Charge (leads one site) → Guard. Office: HR, Accountant, Secretary,
 * Office Assistant, Storekeeper. IT runs the system.
 * (The Postgres enum order is fixed; use this list for anything shown.)
 */
export const ROLE_HIERARCHY = [
  "CEO",
  "SUPER_ADMIN",
  "IT_SUPERVISOR",
  "OPERATIONS_MANAGER",
  "SENIOR_SUPERVISOR",
  "OPERATION_OFFICER",
  "SUPERVISOR",
  "IN_CHARGE",
  "GUARD",
  "HR",
  "BURSAR",
  "SECRETARY",
  "SECRETARY_SUPERVISOR",
  "OFFICE_ASSISTANT",
  "STOREKEEPER",
] as const satisfies readonly RoleValue[];

/**
 * Combined roles: one person doing two jobs (real cases at HKB).
 * They get every permission of both base roles (see rbac.ts), minus the
 * exceptions listed there.
 */
export const COMBINED_ROLES = {
  IT_SUPERVISOR: ["SUPER_ADMIN", "SUPERVISOR"],
  SECRETARY_SUPERVISOR: ["SECRETARY", "SUPERVISOR"],
} as const satisfies Partial<Record<RoleValue, readonly RoleValue[]>>;

/**
 * Roles whose guard work is limited to the guards assigned to them
 * (shift sheet, dashboard counts, reports). IT + Supervisor already sees
 * everything as IT, so it is not limited.
 */
export const OWN_GUARDS_ONLY_ROLES = ["SUPERVISOR", "SECRETARY_SUPERVISOR"] as const satisfies readonly RoleValue[];

export function isOwnGuardsOnly(role: RoleValue | string | null | undefined): boolean {
  return (OWN_GUARDS_ONLY_ROLES as readonly string[]).includes(role ?? "");
}

/**
 * Remote-branch roles: they work only with their own branch's guards and
 * staff (users.branch_id; a guard's branch is their site's region branch).
 */
export const OWN_BRANCH_ONLY_ROLES = ["OFFICE_ASSISTANT"] as const satisfies readonly RoleValue[];

export function isOwnBranchOnly(role: RoleValue | string | null | undefined): boolean {
  return (OWN_BRANCH_ONLY_ROLES as readonly string[]).includes(role ?? "");
}

/** Roles that work only with the guards of the site they lead (stations.in_charge_id). */
export const OWN_SITE_ONLY_ROLES = ["IN_CHARGE"] as const satisfies readonly RoleValue[];

export function isOwnSiteOnly(role: RoleValue | string | null | undefined): boolean {
  return (OWN_SITE_ONLY_ROLES as readonly string[]).includes(role ?? "");
}
