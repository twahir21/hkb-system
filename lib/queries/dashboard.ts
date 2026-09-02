import "server-only";

import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceLogs, guardProfiles, transferRequests } from "@/lib/db/schema";

export async function getDashboardCounts(role: string, userId: string, date = today()) {
  const [guards] = await db.select({ value: count() }).from(guardProfiles);

  const [logs] = await db.select({ value: count() }).from(attendanceLogs);

  const [pendingTransfers] = await db
    .select({ value: count() })
    .from(transferRequests)
    .where(eq(transferRequests.status, "PENDING"));

  // Summary object returned to client — no PII.
  return {
    totalGuards: guards?.value ?? 0,
    totalLogs: logs?.value ?? 0,
    pendingTransfers: pendingTransfers?.value ?? 0,
    date,
    role,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}