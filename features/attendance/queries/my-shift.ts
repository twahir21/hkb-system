import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { attendanceLogs, guardProfiles, stations, users, type LeaveType } from "@/lib/db/schema";
import { getApprovedLeaveOn } from "@/features/leave/queries/leave";

type ShiftLog = {
  date: string;
  shift: "DAY" | "NIGHT";
  status: "PRESENT" | "ABSENT" | "LATE";
  absenceCategory: (typeof attendanceLogs.$inferSelect)["absenceCategory"];
  minutesLate: number | null;
};

export type MyShiftStatus = {
  employeeId: string;
  post: string; // station name, else free-text work location
  supervisorName: string | null;
  today: string;
  todayLogs: { DAY: ShiftLog | null; NIGHT: ShiftLog | null };
  leaveToday: LeaveType | null;
  /** Last 7 days (oldest first), one entry per day with whatever shifts were recorded. */
  week: { date: string; logs: ShiftLog[] }[];
};

const supervisor = alias(users, "supervisor");

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The signed-in guard's own shift status: today (EAT) plus the last 7 days. Null if no guard profile. */
export async function getMyShiftStatus(userId: string): Promise<MyShiftStatus | null> {
  const [profile] = await db
    .select({
      id: guardProfiles.id,
      employeeId: guardProfiles.employeeId,
      workLocation: guardProfiles.workLocation,
      stationName: stations.name,
      supervisorName: supervisor.fullName,
    })
    .from(guardProfiles)
    .leftJoin(stations, eq(guardProfiles.stationId, stations.id))
    .leftJoin(supervisor, eq(guardProfiles.assignedSupervisorId, supervisor.id))
    .where(eq(guardProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });
  const from = addDays(today, -6);

  const [logs, leave] = await Promise.all([
    db
      .select({
        date: attendanceLogs.date,
        shift: attendanceLogs.shift,
        status: attendanceLogs.status,
        absenceCategory: attendanceLogs.absenceCategory,
        minutesLate: attendanceLogs.minutesLate,
      })
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.guardId, profile.id), gte(attendanceLogs.date, from), lte(attendanceLogs.date, today)))
      .orderBy(asc(attendanceLogs.date), asc(attendanceLogs.shift)),
    getApprovedLeaveOn([userId], today),
  ]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    return { date, logs: logs.filter((l) => l.date === date) };
  });
  const todays = week[6].logs;

  return {
    employeeId: profile.employeeId,
    post: profile.stationName ?? profile.workLocation,
    supervisorName: profile.supervisorName,
    today,
    todayLogs: {
      DAY: todays.find((l) => l.shift === "DAY") ?? null,
      NIGHT: todays.find((l) => l.shift === "NIGHT") ?? null,
    },
    leaveToday: leave.get(userId) ?? null,
    week,
  };
}
