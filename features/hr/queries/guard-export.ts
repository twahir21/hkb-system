import "server-only";

import { and, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendanceLogs, guardCredits, type Gender } from "@/lib/db/schema";
import {
  getSupervisors,
  guardsInPeriod,
  listGuards,
  type GuardRow,
} from "@/features/hr/queries/guards";
import { listClients } from "@/features/hr/queries/clients";
import { listRegions, listStations } from "@/features/store/queries/stock";

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

export type GuardPayrollStatus = "ALL" | "ACTIVE" | "DISABLED";

export type GuardPayrollPeriod = {
  fromDate: string;
  toDate: string;
  /** Human label used in the PDF header, e.g. "September 2026". */
  label: string;
};

/** Expand a `YYYY-MM` month into its inclusive first/last day. */
export function monthPeriod(month: string): GuardPayrollPeriod {
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));
  const padded = String(monthNum).padStart(2, "0");
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    fromDate: `${year}-${padded}-01`,
    toDate: `${year}-${padded}-${String(lastDay).padStart(2, "0")}`,
    label: `${MONTH_NAMES[monthNum - 1] ?? month} ${year}`,
  };
}

/** Inclusive date-range label, e.g. "2026-09-01 → 2026-09-21". */
export function rangePeriod(fromDate: string, toDate: string): GuardPayrollPeriod {
  return { fromDate, toDate, label: `${fromDate} → ${toDate}` };
}

export type GuardPayrollRow = {
  guardId: string;
  employeeId: string;
  fullName: string;
  gender: Gender;
  age: number;
  /** Empty string when the caller is not allowed to see PII. */
  phone: string;
  email: string;
  homeLocation: string;
  workLocation: string;
  regionName: string | null;
  clientName: string | null;
  supervisorName: string | null;
  registrationDate: string;
  kinName: string;
  kinRelation: string;
  kinPhone: string;
  isActive: boolean;
  disabledAt: Date | null;
  // Attendance for the period
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
  // Money owed / already deducted — payroll inputs only, no payroll is run here
  outstandingDebt: number;
  outstandingCount: number;
  deductedThisPeriod: number;
};

export type GuardPayrollTotals = {
  guards: number;
  activeGuards: number;
  disabledGuards: number;
  totalShifts: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
  totalMinutesLate: number;
  outstandingDebt: number;
  deductedThisPeriod: number;
  attendancePercentage: number;
};

export type GuardPayrollFilterLabels = {
  statusLabel: string;
  regionName: string | null;
  clientName: string | null;
  supervisorName: string | null;
};

export type GuardPayrollExport = {
  period: GuardPayrollPeriod;
  filters: GuardPayrollFilterLabels;
  totals: GuardPayrollTotals;
  rows: GuardPayrollRow[];
};

export type GuardPayrollQueryFilters = {
  fromDate: string;
  toDate: string;
  regionId?: string;
  clientId?: string;
  supervisorId?: string;
  status?: GuardPayrollStatus;
  includeZeroActivity?: boolean;
  /** When false, phone / email / home / next-of-kin are blanked out. */
  includePii?: boolean;
};

const STATUS_LABELS: Record<GuardPayrollStatus, string> = {
  ALL: "All guards (active + those disabled during the period)",
  ACTIVE: "Active guards only",
  DISABLED: "Disabled guards only",
};

/**
 * Everything payroll needs about every guard in one payload: full profile,
 * attendance totals for the period (with the NOT-PERMITTED deduction flag) and
 * outstanding credit per guard. Payroll itself is intentionally NOT run — this
 * only produces the data the bursar/accountant works from.
 */
export async function getGuardPayrollExport(
  filters: GuardPayrollQueryFilters,
): Promise<GuardPayrollExport> {
  const status: GuardPayrollStatus = filters.status ?? "ALL";
  const includePii = Boolean(filters.includePii);

  const allGuards = await listGuards(includePii, { includeDisabled: true });

  // Region lives on the station, so only build the map when that filter is used.
  let stationRegion = new Map<string, string>();
  if (filters.regionId) {
    const stations = await listStations();
    stationRegion = new Map(stations.map((s) => [s.id, s.regionId]));
  }

  let guards: GuardRow[] = allGuards;
  if (status === "ACTIVE") {
    guards = guards.filter((g) => g.isActive);
  } else if (status === "DISABLED") {
    guards = guards.filter((g) => !g.isActive);
  } else {
    // Guards disabled before the period started were never counted during it;
    // anyone disabled during/after it may still have worked, so they stay in.
    guards = guardsInPeriod(guards, filters.fromDate);
  }

  if (filters.regionId) {
    const regionId = filters.regionId;
    guards = guards.filter(
      (g) => g.stationId !== null && stationRegion.get(g.stationId) === regionId,
    );
  }
  if (filters.clientId) {
    guards = guards.filter((g) => g.clientId === filters.clientId);
  }
  if (filters.supervisorId) {
    guards = guards.filter((g) => g.assignedSupervisorId === filters.supervisorId);
  }

  const guardIds = guards.map((g) => g.id);

  const logAgg = guardIds.length
    ? await db
        .select({
          guardId: attendanceLogs.guardId,
          totalShifts: sql<number>`COUNT(*)`.as("total_shifts"),
          presentCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.status} = 'PRESENT')`.as(
              "present_count",
            ),
          lateCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.status} = 'LATE')`.as(
              "late_count",
            ),
          absentCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.status} = 'ABSENT')`.as(
              "absent_count",
            ),
          sickCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.absenceCategory} = 'SICK')`.as(
              "sick_count",
            ),
          permittedCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.absenceCategory} = 'PERMITTED_REASON')`.as(
              "permitted_count",
            ),
          notPermittedCount:
            sql<number>`COUNT(*) FILTER (WHERE ${attendanceLogs.absenceCategory} = 'NOT_PERMITTED')`.as(
              "not_permitted_count",
            ),
          totalMinutesLate:
            sql<number>`COALESCE(SUM(${attendanceLogs.minutesLate}), 0)`.as(
              "total_minutes_late",
            ),
        })
        .from(attendanceLogs)
        .where(
          and(
            gte(attendanceLogs.date, filters.fromDate),
            lte(attendanceLogs.date, filters.toDate),
            inArray(attendanceLogs.guardId, guardIds),
          ),
        )
        .groupBy(attendanceLogs.guardId)
    : [];

  const periodMonth = filters.fromDate.slice(0, 7);
  const creditAgg = guardIds.length
    ? await db
        .select({
          guardId: guardCredits.guardId,
          outstandingDebt:
            sql<number>`COALESCE(SUM(${guardCredits.amount}) FILTER (WHERE ${guardCredits.status} = 'OUTSTANDING'), 0)`.as(
              "outstanding_debt",
            ),
          outstandingCount:
            sql<number>`COUNT(*) FILTER (WHERE ${guardCredits.status} = 'OUTSTANDING')`.as(
              "outstanding_count",
            ),
          deductedThisPeriod:
            sql<number>`COALESCE(SUM(${guardCredits.amount}) FILTER (WHERE ${guardCredits.status} = 'DEDUCTED' AND ${guardCredits.deductionMonth} = ${periodMonth}), 0)`.as(
              "deducted_this_period",
            ),
        })
        .from(guardCredits)
        .where(inArray(guardCredits.guardId, guardIds))
        .groupBy(guardCredits.guardId)
    : [];

  const logsByGuard = new Map(logAgg.map((r) => [r.guardId, r]));
  const creditsByGuard = new Map(creditAgg.map((r) => [r.guardId, r]));

  let rows: GuardPayrollRow[] = guards.map((g) => {
    const logs = logsByGuard.get(g.id);
    const credits = creditsByGuard.get(g.id);

    const totalShifts = Number(logs?.totalShifts ?? 0);
    const presentCount = Number(logs?.presentCount ?? 0);
    const lateCount = Number(logs?.lateCount ?? 0);

    return {
      guardId: g.id,
      employeeId: g.employeeId,
      fullName: g.fullName,
      gender: g.gender,
      age: g.age,
      phone: g.phone,
      email: g.email,
      homeLocation: g.homeLocation,
      workLocation: g.workLocation,
      regionName: g.regionName,
      clientName: g.clientName,
      supervisorName: g.supervisorName,
      registrationDate: g.registrationDate,
      kinName: g.kinName,
      kinRelation: g.kinRelation,
      kinPhone: g.kinPhone,
      isActive: g.isActive,
      disabledAt: g.disabledAt,
      totalShifts,
      presentCount,
      lateCount,
      absentCount: Number(logs?.absentCount ?? 0),
      sickCount: Number(logs?.sickCount ?? 0),
      permittedCount: Number(logs?.permittedCount ?? 0),
      notPermittedCount: Number(logs?.notPermittedCount ?? 0),
      totalMinutesLate: Number(logs?.totalMinutesLate ?? 0),
      attendancePercentage:
        totalShifts > 0
          ? Math.round(((presentCount + lateCount) / totalShifts) * 1000) / 10
          : 0,
      onTimePercentage:
        totalShifts > 0 ? Math.round((presentCount / totalShifts) * 1000) / 10 : 0,
      outstandingDebt: Number(credits?.outstandingDebt ?? 0),
      outstandingCount: Number(credits?.outstandingCount ?? 0),
      deductedThisPeriod: Number(credits?.deductedThisPeriod ?? 0),
    };
  });

  if (!filters.includeZeroActivity) {
    // Default: only guards with real activity in the period, so the sheet a
    // bursar signs is not padded with hundreds of empty rows. Guards who owe
    // money always stay in — their debt must be deducted.
    rows = rows.filter((r) => r.totalShifts > 0 || r.outstandingDebt > 0);
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    period: rangePeriod(filters.fromDate, filters.toDate),
    filters: await resolveFilterLabels(filters, status),
    totals: buildTotals(rows),
    rows,
  };
}

function buildTotals(rows: GuardPayrollRow[]): GuardPayrollTotals {
  const totals: GuardPayrollTotals = {
    guards: 0,
    activeGuards: 0,
    disabledGuards: 0,
    totalShifts: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    sickCount: 0,
    permittedCount: 0,
    notPermittedCount: 0,
    totalMinutesLate: 0,
    outstandingDebt: 0,
    deductedThisPeriod: 0,
    attendancePercentage: 0,
  };

  for (const r of rows) {
    totals.guards += 1;
    if (r.isActive) totals.activeGuards += 1;
    else totals.disabledGuards += 1;
    totals.totalShifts += r.totalShifts;
    totals.presentCount += r.presentCount;
    totals.lateCount += r.lateCount;
    totals.absentCount += r.absentCount;
    totals.sickCount += r.sickCount;
    totals.permittedCount += r.permittedCount;
    totals.notPermittedCount += r.notPermittedCount;
    totals.totalMinutesLate += r.totalMinutesLate;
    totals.outstandingDebt += r.outstandingDebt;
    totals.deductedThisPeriod += r.deductedThisPeriod;
  }

  totals.attendancePercentage =
    totals.totalShifts > 0
      ? Math.round(
          ((totals.presentCount + totals.lateCount) / totals.totalShifts) * 1000,
        ) / 10
      : 0;

  return totals;
}

/** Human labels for the PDF header ("Scope:" line). */
async function resolveFilterLabels(
  filters: GuardPayrollQueryFilters,
  status: GuardPayrollStatus,
): Promise<GuardPayrollFilterLabels> {
  let regionName: string | null = null;
  let clientName: string | null = null;
  let supervisorName: string | null = null;

  if (filters.regionId) {
    const regions = await listRegions();
    regionName = regions.find((r) => r.id === filters.regionId)?.name ?? null;
  }
  if (filters.clientId) {
    const clients = await listClients();
    clientName = clients.find((c) => c.id === filters.clientId)?.name ?? null;
  }
  if (filters.supervisorId) {
    const supervisors = await getSupervisors();
    supervisorName =
      supervisors.find((s) => s.id === filters.supervisorId)?.fullName ?? null;
  }

  return {
    statusLabel: STATUS_LABELS[status],
    regionName,
    clientName,
    supervisorName,
  };
}
