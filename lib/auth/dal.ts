import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { hasPermission, type Permission } from "./rbac";
import type { Role } from "@/lib/db/schema";

/**
 * Data Access Layer — the single entry point for reading the session
 * and enforcing authorization on the server. Memoized per render pass.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const session = await auth();
  return session?.user ? session : null;
});

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.user) return null;
  return {
    userId: session.user.id as string,
    email: session.user.email as string,
    name: session.user.name as string,
    role: session.user.role as Role,
  };
});

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export const hasCurrentPermission = cache(async (permission: Permission) => {
  const user = await getCurrentUser();
  return hasPermission(user?.role, permission);
});