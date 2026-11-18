import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, users } from "@/lib/db/schema";

export type BranchOption = { id: string; name: string; isHq: boolean };

export type BranchRow = BranchOption & {
  staffCount: number;
  /** Office Assistants who own (run) this branch. */
  owners: string[];
};

/** All branches, HQ first, for dropdowns. */
export async function listBranches(): Promise<BranchOption[]> {
  return db
    .select({ id: branches.id, name: branches.name, isHq: branches.isHq })
    .from(branches)
    .orderBy(desc(branches.isHq), asc(branches.name));
}

/** Branches with staff counts and their Office Assistant owners. */
export async function listBranchesWithOwners(): Promise<BranchRow[]> {
  const [rows, owners] = await Promise.all([
    db
      .select({
        id: branches.id,
        name: branches.name,
        isHq: branches.isHq,
        staffCount: sql<number>`COUNT(${users.id})`.as("staff_count"),
      })
      .from(branches)
      .leftJoin(users, eq(users.branchId, branches.id))
      .groupBy(branches.id)
      .orderBy(desc(branches.isHq), asc(branches.name)),
    db
      .select({ branchId: users.branchId, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, "OFFICE_ASSISTANT"))
      .orderBy(asc(users.fullName)),
  ]);

  return rows.map((r) => ({
    ...r,
    staffCount: Number(r.staffCount),
    owners: owners.filter((o) => o.branchId === r.id).map((o) => o.fullName),
  }));
}

export async function getHqBranchId(): Promise<string | null> {
  const row = await db.query.branches.findFirst({
    where: eq(branches.isHq, true),
    columns: { id: true },
  });
  return row?.id ?? null;
}

/** The branch a user belongs to (read fresh from the DB, not the session). */
export async function getUserBranch(userId: string): Promise<BranchOption | null> {
  const [row] = await db
    .select({ id: branches.id, name: branches.name, isHq: branches.isHq })
    .from(users)
    .innerJoin(branches, eq(users.branchId, branches.id))
    .where(and(eq(users.id, userId)))
    .limit(1);
  return row ?? null;
}
