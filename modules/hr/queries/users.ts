import "server-only";

import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";

export type UserRow = {
  id: string;
  username: string | null;
  email: string;
  fullName: string;
  role: Role;
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
      passwordHash: users.passwordHash,
      googleId: users.googleId,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    email: r.email,
    fullName: r.fullName,
    role: r.role,
    hasPassword: Boolean(r.passwordHash),
    hasGoogle: Boolean(r.googleId),
    avatarUrl: r.avatarUrl,
    createdAt: r.createdAt,
  }));
}
