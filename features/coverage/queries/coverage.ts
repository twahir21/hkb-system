import "server-only";

import { and, count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverageRequests, users } from "@/lib/db/schema";
import type { CoverageRequestStatus } from "@/lib/db/schema";

export type CoverageRequestRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  source: string;
  status: CoverageRequestStatus;
  internalNotes: string | null;
  handledByName: string | null;
  createdAt: Date;
};

export async function listCoverageRequests(
  status?: CoverageRequestStatus,
  limit = 500
): Promise<CoverageRequestRow[]> {
  const rows = await db
    .select({
      id: coverageRequests.id,
      fullName: coverageRequests.fullName,
      email: coverageRequests.email,
      phone: coverageRequests.phone,
      service: coverageRequests.service,
      message: coverageRequests.message,
      source: coverageRequests.source,
      status: coverageRequests.status,
      internalNotes: coverageRequests.internalNotes,
      handledByName: users.fullName,
      createdAt: coverageRequests.createdAt,
    })
    .from(coverageRequests)
    .leftJoin(users, eq(coverageRequests.handledById, users.id))
    .where(status ? eq(coverageRequests.status, status) : undefined)
    .orderBy(desc(coverageRequests.createdAt))
    .limit(limit);

  return rows;
}

/** Unread (NEW) coverage requests created after the viewer last checked. */
export async function countNewCoverageRequests(since?: Date | null) {
  const conditions = since
    ? and(eq(coverageRequests.status, "NEW"), gt(coverageRequests.createdAt, since))
    : eq(coverageRequests.status, "NEW");

  const [row] = await db
    .select({ value: count() })
    .from(coverageRequests)
    .where(conditions);

  return row?.value ?? 0;
}