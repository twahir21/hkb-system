import "server-only";

import type { Role } from "@/lib/db/schema";
import { getStaffBranchLimit } from "./guard-scope";

/**
 * Branch limit for managing branch-owned records (meetings, trainings):
 * null = any branch; a branch id = only that branch; "none" = branch-only role
 * without a branch (may manage nothing).
 */
export type BranchLimit = string | null | "none";

export function getManageBranchLimit(user: { userId: string; role: Role }): Promise<BranchLimit> {
  return getStaffBranchLimit(user.userId, user.role);
}

/**
 * May a user with this limit manage a record of `branchId`?
 * Company-wide records (branchId null) stay with unlimited (HQ) users.
 */
export function canManageBranch(limit: BranchLimit, branchId: string | null): boolean {
  if (limit === null) return true;
  return limit !== "none" && branchId === limit;
}
