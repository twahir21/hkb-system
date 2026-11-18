import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, branches, type Role, type Gender } from "@/lib/db/schema";

export type UserRow = {
  id: string;
  username: string | null;
  email: string;
  fullName: string;
  role: Role;
  gender: Gender;
  branchId: string | null;
  branchName: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  avatarUrl: string | null;
  createdAt: Date;
};

export async function listUsers(): Promise<UserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      gender: users.gender,
      branchId: users.branchId,
      branchName: branches.name,
      passwordHash: users.passwordHash,
      googleId: users.googleId,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(branches, eq(users.branchId, branches.id))
    .orderBy(desc(users.createdAt));

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    email: r.email,
    fullName: r.fullName,
    role: r.role,
    gender: r.gender,
    branchId: r.branchId,
    branchName: r.branchName,
    hasPassword: Boolean(r.passwordHash),
    hasGoogle: Boolean(r.googleId),
    avatarUrl: r.avatarUrl,
    createdAt: r.createdAt,
  }));
}
