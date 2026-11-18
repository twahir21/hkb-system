import type { Role } from "@/lib/db/schema";
import { GUARD_ROLES, ROLE_HIERARCHY, ROLE_VALUES, isGuardRole } from "./roles";

export { GUARD_ROLES, isGuardRole };
import { t } from "@/lib/i18n";

/**
 * Permission → roles mapping derived from the RBAC matrix in system.html §2.
 * Every protected operation is authorized against this single source of truth.
 */
export const PERMISSIONS = {
  // Attendance (Guards)
  ATTENDANCE_RECORD: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
  ],
  ATTENDANCE_EDIT: ["OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  ATTENDANCE_VIEW_ALL: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
    "HR",
    "BURSAR",
    "SECRETARY",
  ],
  ATTENDANCE_VIEW_OWN: ["GUARD", "IN_CHARGE"],
  SICKNESS_DOC_AUDIT: ["SUPER_ADMIN", "HR"],

  // Staff Attendance (Office & Operations Staff)
  STAFF_ATTENDANCE_VIEW: ["SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER"],
  STAFF_ATTENDANCE_RECORD: ["SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER"],
  STAFF_ATTENDANCE_EDIT: ["SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER"],
  // Changing recorded times (check-in / sign-out) — Super Admin only
  STAFF_ATTENDANCE_EDIT_TIME: ["SUPER_ADMIN"],


  // System Users
  USER_MANAGE: ["SUPER_ADMIN"],

  // Guards
  GUARD_MANAGE: ["SUPER_ADMIN", "HR"],
  GUARD_ASSIGN_SUPERVISOR: ["SUPER_ADMIN", "HR"],

  // Transfers
  TRANSFER_INITIATE: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
  ],
  TRANSFER_APPROVE: ["SUPER_ADMIN", "HR", "OPERATIONS_MANAGER"],

  // Store
  STORE_MANAGE_ITEMS: ["SUPER_ADMIN", "STOREKEEPER"],
  STORE_LOCATIONS_MANAGE: ["SUPER_ADMIN", "STOREKEEPER"],
  STOCK_RECORD: ["SUPER_ADMIN", "STOREKEEPER"],
  STOCK_TRANSFER_INITIATE: [
    "SUPER_ADMIN",
    "STOREKEEPER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SUPERVISOR",
  ],
  STOCK_TRANSFER_APPROVE: ["SUPER_ADMIN", "STOREKEEPER"],
  STOCK_VIEW: [
    "SUPER_ADMIN",
    "STOREKEEPER",
    "BURSAR",
    "HR",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SUPERVISOR",
    "SECRETARY",
  ],

  // Coverage requests (public website submissions)
  COVERAGE_VIEW: ["SUPER_ADMIN", "HR", "BURSAR", "SECRETARY"],
  COVERAGE_MANAGE: ["SUPER_ADMIN"],

  // Job applications (public /jobs submissions — guard recruitment)
  JOB_APPLICATIONS_VIEW: ["SUPER_ADMIN", "HR", "SECRETARY"],
  JOB_APPLICATIONS_MANAGE: ["SUPER_ADMIN", "HR"],

  // News / website content
  NEWS_VIEW: ["SUPER_ADMIN", "HR", "SECRETARY"],
  NEWS_MANAGE: ["SUPER_ADMIN", "SECRETARY"],

  // PII / sensitive data
  PII_VIEW: ["SUPER_ADMIN", "HR"],

  // Office credit (guard debts: fish, maize flour, medical)
  CREDIT_RECORD: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  CREDIT_SETTLE: ["SUPER_ADMIN", "BURSAR"],
  CREDIT_VIEW_OWN: ["GUARD", "IN_CHARGE"],

  // Office businesses (fish & maize flour tracking)
  BUSINESS_MANAGE: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  BUSINESS_VIEW: ["SUPER_ADMIN", "BURSAR", "HR", "STOREKEEPER", "SECRETARY"],

  // Reports
  REPORTS_FULL_PDF: ["SUPER_ADMIN", "HR", "BURSAR", "OPERATIONS_MANAGER"],
  REPORTS_SUMMARY: [
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SECRETARY",
    "SUPER_ADMIN",
  ],
  PAYROLL_EXPORT: ["SUPER_ADMIN", "HR", "BURSAR", "OPERATIONS_MANAGER"],

  // Branches (HQ Dar es Salaam + remote branches)
  BRANCH_MANAGE: ["SUPER_ADMIN"],

  // Incident management
  // Report: anyone running sites or offices.
  INCIDENT_REPORT: [
    "SUPER_ADMIN",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SUPERVISOR",
    "IN_CHARGE",
    "HR",
    "SECRETARY",
    "OFFICE_ASSISTANT",
  ],
  // See every incident in every branch, add actions, mark solved / reopen.
  INCIDENT_MANAGE_ALL: ["SUPER_ADMIN", "OPERATIONS_MANAGER"],
  // Same, but only for incidents of the user's own branch.
  INCIDENT_MANAGE_BRANCH: ["OFFICE_ASSISTANT"],

  // Fomu ya Mpangokazi (daily region report)
  MPANGOKAZI_SUBMIT: [
    "SUPERVISOR",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SUPER_ADMIN",
  ],
  // Choose any branch's guards (not only own assigned guards).
  MPANGOKAZI_BRANCH_WIDE: [
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SUPER_ADMIN",
  ],
  // Operations Manager oversees all regions; HQ office sees everything.
  MPANGOKAZI_VIEW_ALL: ["SUPER_ADMIN", "OPERATIONS_MANAGER", "HR", "SECRETARY"],
  // Senior Supervisor (main supervisor of a region) and Operations Officer
  // (receives supervisors' reports) see their own region's forms.
  MPANGOKAZI_VIEW_BRANCH: ["SENIOR_SUPERVISOR", "OPERATION_OFFICER", "OFFICE_ASSISTANT"],

  // Employees (staff directory & HR profile)
  EMPLOYEE_VIEW: ["SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER"],
  EMPLOYEE_MANAGE: ["SUPER_ADMIN", "HR"],
  // Contracts include salary — HR, Accounts and IT only.
  CONTRACT_VIEW: ["SUPER_ADMIN", "HR", "BURSAR"],
  CONTRACT_MANAGE: ["SUPER_ADMIN", "HR"],

  // Leave (Likizo)
  LEAVE_REQUEST_OWN: [...ROLE_VALUES],
  // File a request for another employee (Office Assistant: own branch only).
  LEAVE_FILE_FOR_OTHERS: ["SUPER_ADMIN", "HR", "SECRETARY", "OFFICE_ASSISTANT"],
  LEAVE_APPROVE: ["SUPER_ADMIN", "HR"],
  LEAVE_VIEW_ALL: ["SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER", "BURSAR"],
  LEAVE_VIEW_BRANCH: ["OFFICE_ASSISTANT"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function canViewPii(role: Role | undefined): boolean {
  return hasPermission(role, "PII_VIEW");
}

/** Every role, in display order (single source for forms, filters, CSV import). */
export const ROLES: readonly Role[] = ROLE_HIERARCHY;

export const ROLE_LABELS: Record<Role, string> = t.roles;

/** Badge colour per role (user lists, staff attendance). */
export const ROLE_TONES: Record<Role, "emerald" | "amber" | "rose" | "slate" | "brand" | "violet"> = {
  SUPER_ADMIN: "rose",
  OPERATIONS_MANAGER: "brand",
  SENIOR_SUPERVISOR: "brand",
  OPERATION_OFFICER: "brand",
  SUPERVISOR: "brand",
  IN_CHARGE: "brand",
  HR: "violet",
  SECRETARY: "violet",
  OFFICE_ASSISTANT: "violet",
  BURSAR: "emerald",
  STOREKEEPER: "amber",
  GUARD: "slate",
};

/** Field roles that can be assigned guards (supervisor dropdowns). */
export const SUPERVISOR_ROLES = [
  "SUPERVISOR",
  "OPERATION_OFFICER",
  "SENIOR_SUPERVISOR",
  "OPERATIONS_MANAGER",
  "SUPER_ADMIN",
] as const satisfies readonly Role[];

/** Office / operations staff (everyone except guards and In-Charges). */
export const STAFF_ROLES: readonly Role[] = ROLES.filter((r) => !isGuardRole(r));