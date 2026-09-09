"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser, hasCurrentPermission } from "@/lib/auth/dal";

/**
 * POST /api/coverage-seen — called by the coverage-requests page after render
 * so the sidebar "new" badge clears for the current viewer.
 */
export async function POST() {
  if (!(await hasCurrentPermission("COVERAGE_VIEW"))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  await db
    .update(users)
    .set({ coverageRequestsLastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.userId));

  return Response.json({ ok: true });
}