import type { Role } from "@/lib/db/schema";

/**
 * Permission → roles mapping derived from the RBAC matrix in system.html §2.
 * Every protected operation is authorized against this single source of truth.
 */
export const PERMISSIONS = {
  // Attendance
  ATTENDANCE_RECORD: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
  ],
  ATTENDANCE_EDIT: ["SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  ATTENDANCE_VIEW_ALL: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
    "HR",
    "BURSAR",
    "SECRETARY",
  ],
  ATTENDANCE_VIEW_OWN: ["GUARD"],
  SICKNESS_DOC_AUDIT: ["SUPER_ADMIN", "HR"],

  // System Users
  USER_MANAGE: ["SUPER_ADMIN"],

  // Guards
  GUARD_MANAGE: ["SUPER_ADMIN", "HR"],
  GUARD_ASSIGN_SUPERVISOR: ["SUPER_ADMIN", "HR"],

  // Transfers
  TRANSFER_INITIATE: [
    "SUPERVISOR",
    "OPERATION_OFFICER",
    "SENIOR_SUPERVISOR",
    "SUPER_ADMIN",
  ],
  TRANSFER_APPROVE: ["SUPER_ADMIN", "HR"],

  // Store
  STORE_MANAGE_ITEMS: ["SUPER_ADMIN", "STOREKEEPER"],
  STORE_LOCATIONS_MANAGE: ["SUPER_ADMIN", "STOREKEEPER"],
  STOCK_RECORD: ["SUPER_ADMIN", "STOREKEEPER"],
  STOCK_TRANSFER_INITIATE: [
    "SUPER_ADMIN",
    "STOREKEEPER",
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
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SUPERVISOR",
    "SECRETARY",
  ],

  // Coverage requests (public website submissions)
  COVERAGE_VIEW: ["SUPER_ADMIN", "HR", "BURSAR", "SECRETARY"],
  COVERAGE_MANAGE: ["SUPER_ADMIN"],

  // PII / sensitive data
  PII_VIEW: ["SUPER_ADMIN", "HR"],

  // Office credit (guard debts: fish, maize flour, medical)
  CREDIT_RECORD: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  CREDIT_SETTLE: ["SUPER_ADMIN", "BURSAR"],
  CREDIT_VIEW_OWN: ["GUARD"],

  // Office businesses (fish & maize flour tracking)
  BUSINESS_MANAGE: ["SUPER_ADMIN", "BURSAR", "STOREKEEPER"],
  BUSINESS_VIEW: ["SUPER_ADMIN", "BURSAR", "HR", "STOREKEEPER", "SECRETARY"],

  // Reports
  REPORTS_FULL_PDF: ["SUPER_ADMIN", "HR", "BURSAR"],
  REPORTS_SUMMARY: [
    "SENIOR_SUPERVISOR",
    "OPERATION_OFFICER",
    "SECRETARY",
    "SUPER_ADMIN",
  ],
  PAYROLL_EXPORT: ["SUPER_ADMIN", "HR", "BURSAR"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function canViewPii(role: Role | undefined): boolean {
  return hasPermission(role, "PII_VIEW");
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SENIOR_SUPERVISOR: "Senior Supervisor",
  OPERATION_OFFICER: "Operations Officer",
  SUPERVISOR: "Supervisor",
  HR: "HR Personnel",
  BURSAR: "Bursar / Finance",
  STOREKEEPER: "Storekeeper",
  SECRETARY: "Secretary",
  GUARD: "Askari / Guard",
};