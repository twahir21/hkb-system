import type { Role } from "@/lib/db/schema";
import { COMBINED_ROLES, GUARD_ROLES, ROLE_HIERARCHY, ROLE_VALUES, isGuardRole, isOwnGuardsOnly } from "./roles";

export { GUARD_ROLES, isGuardRole, isOwnGuardsOnly };
import { t } from "@/lib/i18n";

/**
 * Permission → roles mapping derived from the RBAC matrix in system.html §2.
 * Every protected operation is authorized against this single source of truth.
 */
const BASE_PERMISSIONS = {
  // Attendance (Guards)
  // In-Charge: only the guards of the site they lead (see guard-scope.ts).
  ATTENDANCE_RECORD: [
    "SUPERVISOR",
    "IN_CHARGE",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
  ],
  ATTENDANCE_EDIT: ["OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  ATTENDANCE_VIEW_ALL: ["CEO", 
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
    "HR",
    "BURSAR",
    "SECRETARY",
    // Office Assistant: own branch only (guard-scope.ts).
    "OFFICE_ASSISTANT",
  ],
  ATTENDANCE_VIEW_OWN: ["GUARD", "IN_CHARGE"],
  SICKNESS_DOC_AUDIT: ["CEO", "SUPER_ADMIN", "HR"],

  // Staff Attendance (Office & Operations Staff)
  // Office Assistant: own branch's staff only (getStaffBranchLimit).
  STAFF_ATTENDANCE_VIEW: ["CEO", "SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER", "OFFICE_ASSISTANT"],
  STAFF_ATTENDANCE_RECORD: ["SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER", "OFFICE_ASSISTANT"],
  STAFF_ATTENDANCE_EDIT: ["SUPER_ADMIN", "BURSAR", "SECRETARY", "STOREKEEPER", "OFFICE_ASSISTANT"],
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
  TRANSFER_APPROVE: ["CEO", "SUPER_ADMIN", "HR", "OPERATIONS_MANAGER"],

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
  STOCK_VIEW: ["CEO", 
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
  COVERAGE_VIEW: ["CEO", "SUPER_ADMIN", "HR", "BURSAR", "SECRETARY"],
  COVERAGE_MANAGE: ["SUPER_ADMIN"],

  // Job applications (public /jobs submissions — guard recruitment)
  JOB_APPLICATIONS_VIEW: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY"],
  JOB_APPLICATIONS_MANAGE: ["SUPER_ADMIN", "HR"],

  // News / website content
  NEWS_VIEW: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY"],
  NEWS_MANAGE: ["SUPER_ADMIN", "SECRETARY"],

  // PII / sensitive data
  PII_VIEW: ["CEO", "SUPER_ADMIN", "HR"],

  // Office credit (guard debts: fish, maize flour, medical)
  CREDIT_RECORD: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  CREDIT_SETTLE: ["SUPER_ADMIN", "BURSAR"],
  CREDIT_VIEW_OWN: ["GUARD", "IN_CHARGE"],

  // Office businesses (fish & maize flour tracking)
  BUSINESS_MANAGE: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  BUSINESS_VIEW: ["CEO", "SUPER_ADMIN", "BURSAR", "HR", "STOREKEEPER", "SECRETARY"],

  // Reports
  REPORTS_FULL_PDF: ["CEO", "SUPER_ADMIN", "HR", "BURSAR", "OPERATIONS_MANAGER"],
  REPORTS_SUMMARY: ["CEO", 
    "OPERATIONS_MANAGER",
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SECRETARY",
    "SUPER_ADMIN",
    // Office Assistant: own branch's guards only.
    "OFFICE_ASSISTANT",
  ],
  PAYROLL_EXPORT: ["CEO", "SUPER_ADMIN", "HR", "BURSAR", "OPERATIONS_MANAGER"],

  // Branches (HQ Dar es Salaam + remote branches)
  BRANCH_MANAGE: ["SUPER_ADMIN"],

  // Incident management
  // Report: anyone running sites or offices.
  INCIDENT_REPORT: ["CEO", 
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
  INCIDENT_MANAGE_ALL: ["CEO", "SUPER_ADMIN", "OPERATIONS_MANAGER"],
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
  MPANGOKAZI_VIEW_ALL: ["CEO", "SUPER_ADMIN", "OPERATIONS_MANAGER", "HR", "SECRETARY"],
  // Senior Supervisor (main supervisor of a region) and Operations Officer
  // (receives supervisors' reports) see their own region's forms.
  MPANGOKAZI_VIEW_BRANCH: ["SENIOR_SUPERVISOR", "OPERATION_OFFICER", "OFFICE_ASSISTANT"],

  // Employees (staff directory & HR profile)
  // Office Assistant: own branch only.
  EMPLOYEE_VIEW: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER", "OFFICE_ASSISTANT"],
  EMPLOYEE_MANAGE: ["SUPER_ADMIN", "HR"],
  // Contracts include salary — HR, Accounts and IT only.
  CONTRACT_VIEW: ["CEO", "SUPER_ADMIN", "HR", "BURSAR"],
  CONTRACT_MANAGE: ["SUPER_ADMIN", "HR"],
  // Employee documents (IDs, certificates) are PII — same viewers as PII_VIEW.
  // Office Assistant scoping applies if widened later (D6).
  EMPLOYEE_DOC_VIEW: ["CEO", "SUPER_ADMIN", "HR"],
  EMPLOYEE_DOC_MANAGE: ["SUPER_ADMIN", "HR"],

  // Leave (Likizo)
  LEAVE_REQUEST_OWN: [...ROLE_VALUES],
  // File a request for another employee (Office Assistant: own branch only).
  LEAVE_FILE_FOR_OTHERS: ["SUPER_ADMIN", "HR", "SECRETARY", "OFFICE_ASSISTANT"],
  LEAVE_APPROVE: ["CEO", "SUPER_ADMIN", "HR"],
  LEAVE_VIEW_ALL: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER", "BURSAR"],
  LEAVE_VIEW_BRANCH: ["OFFICE_ASSISTANT"],

  // Meetings (Vikao). Everyone sees meetings they are invited to.
  // Office Assistant (D6.3): manages and sees its own branch's meetings only (branch-limit.ts).
  MEETING_MANAGE: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OFFICE_ASSISTANT"],
  MEETING_VIEW_ALL: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER"],
  MEETING_VIEW_BRANCH: ["OFFICE_ASSISTANT"],

  // Trainings (Mafunzo). Everyone sees company-wide trainings and their own branch's.
  // Office Assistant (D6.3): manages its own branch's trainings only (branch-limit.ts).
  TRAINING_MANAGE: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OFFICE_ASSISTANT"],
  TRAINING_VIEW_ALL: ["CEO", "SUPER_ADMIN", "HR", "SECRETARY", "OPERATIONS_MANAGER"],
} as const;

export type Permission = keyof typeof BASE_PERMISSIONS;

/**
 * D6.1 — HR has full access to the HR suite (leave, employees, contracts,
 * employee documents, trainings, meetings) for ALL branches. Compile-time
 * guard: any permission with one of these prefixes that leaves HR out fails
 * `tsc`. Branch-limited variants (held instead of the *_VIEW_ALL one) are
 * listed as exceptions.
 */
type HrSuitePermission = Extract<
  Permission,
  `${"LEAVE_" | "EMPLOYEE_" | "CONTRACT_" | "TRAINING_" | "MEETING_"}${string}`
>;
type HrSuiteExceptions = "LEAVE_VIEW_BRANCH" | "MEETING_VIEW_BRANCH";
type HrMissing = {
  [P in Exclude<HrSuitePermission, HrSuiteExceptions>]: "HR" extends (typeof BASE_PERMISSIONS)[P][number] ? never : P;
}[Exclude<HrSuitePermission, HrSuiteExceptions>];
type AssertNever<T extends never> = T;
/** If this errors, add "HR" to the permission named in the error (or list it as an exception). */
export type HrFullAccessCheck = AssertNever<HrMissing>;

/**
 * D6.2 — Secretary (HQ): manages meetings and trainings, views every employee,
 * and files leave for anyone (all branches; not branch-limited like Office
 * Assistant). Approving leave and editing employees/contracts stay with HR.
 */
type SecretaryRequired =
  | "MEETING_MANAGE"
  | "MEETING_VIEW_ALL"
  | "TRAINING_MANAGE"
  | "TRAINING_VIEW_ALL"
  | "EMPLOYEE_VIEW"
  | "LEAVE_FILE_FOR_OTHERS"
  | "LEAVE_VIEW_ALL";
type SecretaryMissing = {
  [P in SecretaryRequired]: "SECRETARY" extends (typeof BASE_PERMISSIONS)[P][number] ? never : P;
}[SecretaryRequired];
/** If this errors, add "SECRETARY" to the permission named in the error. */
export type SecretaryAccessCheck = AssertNever<SecretaryMissing>;

/**
 * D6.3 — Office Assistant: the Secretary's HR-suite duties (meetings, trainings,
 * employee view, leave intake) limited to its own branch. The branch limit is
 * enforced in queries/actions via getStaffBranchLimit (lib/auth/branch-limit.ts).
 */
type OfficeAssistantRequired =
  | "MEETING_MANAGE"
  | "MEETING_VIEW_BRANCH"
  | "TRAINING_MANAGE"
  | "EMPLOYEE_VIEW"
  | "LEAVE_FILE_FOR_OTHERS"
  | "LEAVE_VIEW_BRANCH";
type OfficeAssistantMissing = {
  [P in OfficeAssistantRequired]: "OFFICE_ASSISTANT" extends (typeof BASE_PERMISSIONS)[P][number] ? never : P;
}[OfficeAssistantRequired];
/** If this errors, add "OFFICE_ASSISTANT" to the permission named in the error. */
export type OfficeAssistantAccessCheck = AssertNever<OfficeAssistantMissing>;

/**
 * Combined roles never get these from a base role:
 * - IT + Supervisor writes Mpangokazi for their own guards, not a whole branch.
 */
const COMBINED_EXCEPTIONS: Partial<Record<keyof typeof COMBINED_ROLES, Permission[]>> = {
  IT_SUPERVISOR: ["MPANGOKAZI_BRANCH_WIDE"],
};

/** Final permission → roles map: base roles plus combined roles that inherit them. */
export const PERMISSIONS: Record<Permission, readonly Role[]> = Object.fromEntries(
  (Object.entries(BASE_PERMISSIONS) as [Permission, readonly Role[]][]).map(([perm, roles]) => {
    const combined = (Object.entries(COMBINED_ROLES) as [keyof typeof COMBINED_ROLES, readonly Role[]][])
      .filter(([role, bases]) => bases.some((b) => roles.includes(b)) && !COMBINED_EXCEPTIONS[role]?.includes(perm))
      .map(([role]) => role);
    return [perm, [...new Set([...roles, ...combined])]];
  })
) as unknown as Record<Permission, readonly Role[]>;

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
  CEO: "rose",
  SUPER_ADMIN: "rose",
  OPERATIONS_MANAGER: "brand",
  SENIOR_SUPERVISOR: "brand",
  OPERATION_OFFICER: "brand",
  SUPERVISOR: "brand",
  IN_CHARGE: "brand",
  IT_SUPERVISOR: "rose",
  SECRETARY_SUPERVISOR: "violet",
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
  "IT_SUPERVISOR",
  "SECRETARY_SUPERVISOR",
  "OPERATION_OFFICER",
  "SENIOR_SUPERVISOR",
  "OPERATIONS_MANAGER",
  "SUPER_ADMIN",
] as const satisfies readonly Role[];

/** Office / operations staff (everyone except guards and In-Charges). */
export const STAFF_ROLES: readonly Role[] = ROLES.filter((r) => !isGuardRole(r));