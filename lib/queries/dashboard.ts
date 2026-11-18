import "server-only";

import { and, count, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceLogs,
  coverageRequests,
  guardProfiles,
  stations,
  stockTransfers,
  transferRequests,
} from "@/lib/db/schema";
import { isOwnGuardsOnly } from "@/lib/auth/roles";

export type DailyTrendPoint = {
  date: string;
  dayLabel: string;
  present: number;
  late: number;
  absent: number;
  total: number;
};

/**
 * `scopedGuardIds`: guards the user works with (null = all guards).
 * Used for "Assigned Guards"; org-wide totals stay unscoped.
 */
export async function getDashboardCounts(
  role: string,
  userId: string,
  scopedGuardIds: string[] | null = null,
  date = today()
) {
  // Disabled guards are not counted anywhere on the dashboard — they are only
  // visible in the Guard Registry and the payroll export.
  const [guards] = await db
    .select({ value: count() })
    .from(guardProfiles)
    .where(eq(guardProfiles.isActive, true));
  const [assignedGuards] = await db
    .select({ value: count() })
    .from(guardProfiles)
    .where(
      and(
        eq(guardProfiles.isActive, true),
        scopedGuardIds === null
          ? undefined
          : scopedGuardIds.length
            ? inArray(guardProfiles.id, scopedGuardIds)
            : sql`false`
      )
    );

  const [unassignedGuards] = await db
    .select({ value: count() })
    .from(guardProfiles)
    .where(
      and(
        eq(guardProfiles.isActive, true),
        isNull(guardProfiles.assignedSupervisorId)
      )
    );

  const [disabledGuards] = await db
    .select({ value: count() })
    .from(guardProfiles)
    .where(eq(guardProfiles.isActive, false));

  const [totalStations] = await db
    .select({ value: count() })
    .from(stations)
    .where(isOwnGuardsOnly(role) ? eq(stations.supervisorId, userId) : undefined);

  const [pendingTransfers] = await db
    .select({ value: count() })
    .from(transferRequests)
    .where(eq(transferRequests.status, "PENDING"));

  const [pendingStockTransfers] = await db
    .select({ value: count() })
    .from(stockTransfers)
    .where(eq(stockTransfers.status, "PENDING"));

  const [pendingCoverage] = await db
    .select({ value: count() })
    .from(coverageRequests)
    .where(eq(coverageRequests.status, "NEW"));

  return {
    totalGuards: guards?.value ?? 0,
    assignedGuards: assignedGuards?.value ?? 0,
    unassignedGuards: unassignedGuards?.value ?? 0,
    disabledGuards: disabledGuards?.value ?? 0,
    totalStations: totalStations?.value ?? 0,
    pendingTransfers: pendingTransfers?.value ?? 0,
    pendingStockTransfers: pendingStockTransfers?.value ?? 0,
    pendingCoverageRequests: pendingCoverage?.value ?? 0,
    date,
    role,
  };
}

/** `guardIds`: limit to these guards (null = all guards, [] = none). */
export async function get7DayAttendanceTrend(
  guardIds: string[] | null = null
): Promise<DailyTrendPoint[]> {
  const points: DailyTrendPoint[] = [];
  const now = new Date();
  const dateStrings: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    dateStrings.push(iso);
  }

  const startDate = dateStrings[0];
  const endDate = dateStrings[dateStrings.length - 1];

  const guardFilterIds = guardIds;

  const logs = await db
    .select({
      date: attendanceLogs.date,
      status: attendanceLogs.status,
    })
    .from(attendanceLogs)
    .where(
      and(
        gte(attendanceLogs.date, startDate),
        lte(attendanceLogs.date, endDate),
        guardFilterIds === null
          ? undefined
          : guardFilterIds.length
            ? inArray(attendanceLogs.guardId, guardFilterIds)
            : sql`false`
      )
    );

  const logsByDate = new Map<string, { present: number; late: number; absent: number }>();
  for (const iso of dateStrings) {
    logsByDate.set(iso, { present: 0, late: 0, absent: 0 });
  }

  for (const log of logs) {
    const entry = logsByDate.get(log.date);
    if (!entry) continue;
    if (log.status === "PRESENT") entry.present++;
    else if (log.status === "LATE") entry.late++;
    else if (log.status === "ABSENT") entry.absent++;
  }

  for (const iso of dateStrings) {
    const stats = logsByDate.get(iso) || { present: 0, late: 0, absent: 0 };
    const dateObj = new Date(iso + "T00:00:00");
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const dayMonth = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    points.push({
      date: iso,
      dayLabel: `${dayName} (${dayMonth})`,
      present: stats.present,
      late: stats.late,
      absent: stats.absent,
      total: stats.present + stats.late + stats.absent,
    });
  }

  return points;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}