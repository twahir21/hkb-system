import type { LeaveType } from "@/lib/db/schema";

/**
 * Yearly entitlement in days (Tanzania Employment and Labour Relations Act
 * minimums). null = no yearly limit (unpaid leave).
 */
export const LEAVE_ENTITLEMENT: Record<LeaveType, number | null> = {
  ANNUAL: 28,
  SICK: 126,
  MATERNITY: 84,
  PATERNITY: 3,
  COMPASSIONATE: 4,
  UNPAID: null,
};

/** Inclusive calendar days between two YYYY-MM-DD dates. */
export function leaveDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}
