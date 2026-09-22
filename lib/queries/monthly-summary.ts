import "server-only";

import { and, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceLogs } from "@/lib/db/schema";
import { guardsInPeriod, listGuards } from "@/features/hr/queries/guards";
import {
  listLogs,
  type LogRow,
} from "@/features/attendance/queries/attendance";

export type GuardMonthlyStat = {
  guardId: string;
  userId: string;
  employeeId: string;
  fullName: string;
  workLocation: string;
  supervisorName: string | null;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  attendancePercentage: number;
  onTimePercentage: number;
  performanceTier: "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL" | "NO_DATA";
};

export type MonthlyDailyTrendPoint = {
  day: number;
  date: string;
  dayLabel: string;
  present: number;
  late: number;
  absent: number;
  sick: number;
  permitted: number;
  notPermitted: number;
  total: number;
  rate: number;
};

export type SupervisorMonthlyStat = {
  name: string;
  shifts: number;
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
};

export type TierDistribution = {
  excellent: number;
  good: number;
  warning: number;
  critical: number;
  noData: number;
};

export type OverallMonthlySummary = {
  year: number;
  month: number;
  monthName: string;
  startDate: string;
  endDate: string;
  totalGuards: number;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  overallAttendancePercentage: number;
  overallOnTimePercentage: number;
  tierDistribution: TierDistribution;
  dailyTrend: MonthlyDailyTrendPoint[];
  supervisorStats: SupervisorMonthlyStat[];
  guards: GuardMonthlyStat[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function getMonthlyAttendanceSummary(
  year: number,
  month: number,
  supervisorId?: string,
  includePii = false,
): Promise<OverallMonthlySummary> {
  // Format start and end date (e.g. 2026-09-01 to 2026-09-30)
  const paddedMonth = String(month).padStart(2, "0");
  const startDate = `${year}-${paddedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

  // Period report: active guards plus anyone disabled during/after this period
  // (they may still have worked part of it and must appear for payroll).
  const allGuards = guardsInPeriod(
    await listGuards(includePii, { includeDisabled: true }),
    startDate,
  );
  const guards = supervisorId
    ? allGuards.filter((g) => g.assignedSupervisorId === supervisorId)
    : allGuards;

  const guardIds = guards.map((g) => g.id);

  const logs = guardIds.length
    ? await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            gte(attendanceLogs.date, startDate),
            lte(attendanceLogs.date, endDate),
            inArray(attendanceLogs.guardId, guardIds),
          ),
        )
    : [];

  // Group logs by guardId and by Date
  const logsByGuard = new Map<string, (typeof attendanceLogs.$inferSelect)[]>();
  const logsByDate = new Map<string, (typeof attendanceLogs.$inferSelect)[]>();

  for (const log of logs) {
    const list = logsByGuard.get(log.guardId) || [];
    list.push(log);
    logsByGuard.set(log.guardId, list);

    const dList = logsByDate.get(log.date) || [];
    dList.push(log);
    logsByDate.set(log.date, dList);
  }

  let totalPresent = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalSick = 0;
  let totalPermitted = 0;
  let totalNotPermitted = 0;
  let totalLateMins = 0;

  const tierDistribution: TierDistribution = {
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0,
    noData: 0,
  };

  const supervisorMap = new Map<
    string,
    { shifts: number; present: number; late: number; absent: number }
  >();

  const guardStats: GuardMonthlyStat[] = guards.map((g) => {
    const guardLogs = logsByGuard.get(g.id) || [];
    const total = guardLogs.length;

    let present = 0;
    let late = 0;
    let absent = 0;
    let sick = 0;
    let permitted = 0;
    let notPermitted = 0;
    let lateMinutes = 0;

    for (const l of guardLogs) {
      if (l.status === "PRESENT") {
        present++;
      } else if (l.status === "LATE") {
        late++;
        if (l.minutesLate) lateMinutes += l.minutesLate;
      } else if (l.status === "ABSENT") {
        absent++;
        if (l.absenceCategory === "SICK") sick++;
        else if (l.absenceCategory === "PERMITTED_REASON") permitted++;
        else if (l.absenceCategory === "NOT_PERMITTED") notPermitted++;
      }
    }

    totalPresent += present;
    totalLate += late;
    totalAbsent += absent;
    totalSick += sick;
    totalPermitted += permitted;
    totalNotPermitted += notPermitted;
    totalLateMins += lateMinutes;

    const supName = g.supervisorName || "Unassigned";
    const sStat = supervisorMap.get(supName) || {
      shifts: 0,
      present: 0,
      late: 0,
      absent: 0,
    };
    sStat.shifts += total;
    sStat.present += present;
    sStat.late += late;
    sStat.absent += absent;
    supervisorMap.set(supName, sStat);

    const attendancePct =
      total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;
    const onTimePct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    let tier: GuardMonthlyStat["performanceTier"] = "NO_DATA";
    if (total > 0) {
      if (attendancePct >= 95) {
        tier = "EXCELLENT";
        tierDistribution.excellent++;
      } else if (attendancePct >= 85) {
        tier = "GOOD";
        tierDistribution.good++;
      } else if (attendancePct >= 70) {
        tier = "WARNING";
        tierDistribution.warning++;
      } else {
        tier = "CRITICAL";
        tierDistribution.critical++;
      }
    } else {
      tierDistribution.noData++;
    }

    return {
      guardId: g.id,
      userId: g.userId,
      employeeId: g.employeeId,
      fullName: g.fullName,
      workLocation: g.workLocation,
      supervisorName: g.supervisorName,
      totalShifts: total,
      presentCount: present,
      lateCount: late,
      absentCount: absent,
      sickCount: sick,
      permittedCount: permitted,
      notPermittedCount: notPermitted,
      totalMinutesLate: lateMinutes,
      attendancePercentage: attendancePct,
      onTimePercentage: onTimePct,
      performanceTier: tier,
    };
  });

  const totalShifts = logs.length;
  const overallAttendancePct =
    totalShifts > 0
      ? Math.round(((totalPresent + totalLate) / totalShifts) * 1000) / 10
      : 0;
  const overallOnTimePct =
    totalShifts > 0 ? Math.round((totalPresent / totalShifts) * 1000) / 10 : 0;

  // Build daily trend array across the month
  const dailyTrend: MonthlyDailyTrendPoint[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const iso = `${year}-${paddedMonth}-${String(day).padStart(2, "0")}`;
    const dayLogs = logsByDate.get(iso) || [];

    let p = 0;
    let l = 0;
    let a = 0;
    let s = 0;
    let perm = 0;
    let unexc = 0;

    for (const log of dayLogs) {
      if (log.status === "PRESENT") p++;
      else if (log.status === "LATE") l++;
      else if (log.status === "ABSENT") {
        a++;
        if (log.absenceCategory === "SICK") s++;
        else if (log.absenceCategory === "PERMITTED_REASON") perm++;
        else if (log.absenceCategory === "NOT_PERMITTED") unexc++;
      }
    }

    const t = dayLogs.length;
    const rate = t > 0 ? Math.round(((p + l) / t) * 1000) / 10 : 0;

    dailyTrend.push({
      day,
      date: iso,
      dayLabel: `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`,
      present: p,
      late: l,
      absent: a,
      sick: s,
      permitted: perm,
      notPermitted: unexc,
      total: t,
      rate,
    });
  }

  // Build supervisor ranking list
  const supervisorStats: SupervisorMonthlyStat[] = Array.from(
    supervisorMap.entries()
  )
    .map(([name, stat]) => ({
      name,
      shifts: stat.shifts,
      present: stat.present,
      late: stat.late,
      absent: stat.absent,
      attendancePercentage:
        stat.shifts > 0
          ? Math.round(((stat.present + stat.late) / stat.shifts) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.shifts - a.shifts);

  return {
    year,
    month,
    monthName: MONTH_NAMES[month - 1] ?? `Month ${month}`,
    startDate,
    endDate,
    totalGuards: guards.length,
    totalShifts,
    presentCount: totalPresent,
    lateCount: totalLate,
    absentCount: totalAbsent,
    sickCount: totalSick,
    permittedCount: totalPermitted,
    notPermittedCount: totalNotPermitted,
    totalMinutesLate: totalLateMins,
    overallAttendancePercentage: overallAttendancePct,
    overallOnTimePercentage: overallOnTimePct,
    tierDistribution,
    dailyTrend,
    supervisorStats,
    guards: guardStats,
  };
}

export type GuardMonthlyDetail = {
  guard: {
    guardId: string;
    userId: string;
    employeeId: string;
    fullName: string;
    workLocation: string;
    supervisorName: string | null;
  };
  year: number;
  month: number;
  monthName: string;
  startDate: string;
  endDate: string;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  attendancePercentage: number;
  onTimePercentage: number;
  performanceTier: GuardMonthlyStat["performanceTier"];
  logs: LogRow[];
};

/**
 * Full monthly attendance detail for a single guard: aggregate stats plus
 * the per-day attendance logs behind them.
 */
export async function getGuardMonthlyDetail(
  guardId: string,
  year: number,
  month: number,
): Promise<GuardMonthlyDetail | null> {
  const paddedMonth = String(month).padStart(2, "0");
  const startDate = `${year}-${paddedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

  // History lookup: a disabled guard's past months must stay reachable.
  const allGuards = await listGuards(false, { includeDisabled: true });
  const guard = allGuards.find((g) => g.id === guardId);
  if (!guard) return null;

  const logs = await listLogs({
    guardId,
    fromDate: startDate,
    toDate: endDate,
    limit: 200,
  });

  let present = 0;
  let late = 0;
  let absent = 0;
  let sick = 0;
  let permitted = 0;
  let notPermitted = 0;
  let lateMinutes = 0;

  for (const l of logs) {
    if (l.status === "PRESENT") {
      present++;
    } else if (l.status === "LATE") {
      late++;
      if (l.minutesLate) lateMinutes += l.minutesLate;
    } else if (l.status === "ABSENT") {
      absent++;
      if (l.absenceCategory === "SICK") sick++;
      else if (l.absenceCategory === "PERMITTED_REASON") permitted++;
      else if (l.absenceCategory === "NOT_PERMITTED") notPermitted++;
    }
  }

  const total = logs.length;
  const attendancePct =
    total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;
  const onTimePct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

  let tier: GuardMonthlyDetail["performanceTier"] = "NO_DATA";
  if (total > 0) {
    if (attendancePct >= 95) tier = "EXCELLENT";
    else if (attendancePct >= 85) tier = "GOOD";
    else if (attendancePct >= 70) tier = "WARNING";
    else tier = "CRITICAL";
  }

  return {
    guard: {
      guardId: guard.id,
      userId: guard.userId,
      employeeId: guard.employeeId,
      fullName: guard.fullName,
      workLocation: guard.workLocation,
      supervisorName: guard.supervisorName,
    },
    year,
    month,
    monthName: MONTH_NAMES[month - 1] ?? `Month ${month}`,
    startDate,
    endDate,
    totalShifts: total,
    presentCount: present,
    lateCount: late,
    absentCount: absent,
    sickCount: sick,
    permittedCount: permitted,
    notPermittedCount: notPermitted,
    totalMinutesLate: lateMinutes,
    attendancePercentage: attendancePct,
    onTimePercentage: onTimePct,
    performanceTier: tier,
    logs,
  };
}
