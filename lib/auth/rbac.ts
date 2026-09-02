import type { Role } from "@/lib/db/schema";

/**
 * Permission → roles mapping derived from the RBAC matrix in system.html §2.
 * Every protected operation is authorized against this single source of truth.
 */
export const PERMISSIONS = {
  // Attendance
  ATTENDANCE_RECORD: ["SUPERVISOR", "SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  ATTENDANCE_EDIT: ["SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  ATTENDANCE_VIEW_ALL: ["SUPERVISOR", "SENIOR_SUPERVISOR", "SUPER_ADMIN", "HR", "BURSAR"],
  ATTENDANCE_VIEW_OWN: ["GUARD"],
  SICKNESS_DOC_AUDIT: ["SUPER_ADMIN", "HR"],

  // Guards
  GUARD_MANAGE: ["SUPER_ADMIN", "HR"],
  GUARD_ASSIGN_SUPERVISOR: ["SUPER_ADMIN", "HR"],

  // Transfers
  TRANSFER_INITIATE: ["SUPERVISOR", "SENIOR_SUPERVISOR", "SUPER_ADMIN"],
  TRANSFER_APPROVE: ["SUPER_ADMIN", "HR"],

  // PII / sensitive data
  PII_VIEW: ["SUPER_ADMIN", "HR"],

  // Reports
  REPORTS_FULL_PDF: ["SUPER_ADMIN", "HR", "BURSAR"],
  REPORTS_SUMMARY: ["SENIOR_SUPERVISOR", "SUPER_ADMIN"],
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
  SUPERVISOR: "Supervisor",
  HR: "HR Personnel",
  BURSAR: "Bursar / Finance",
  GUARD: "Askari / Guard",
};