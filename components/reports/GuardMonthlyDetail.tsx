"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Clock, XCircle, Award, ArrowLeft } from "lucide-react";
import { Badge, Button, DataTable, statusTone, type Column } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { GuardMonthlyDetail } from "@/lib/queries/monthly-summary";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const TIER_TONE = {
  EXCELLENT: "emerald",
  GOOD: "brand",
  WARNING: "amber",
  CRITICAL: "rose",
  NO_DATA: "slate",
} as const;

const TIER_LABEL = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  WARNING: "Warning",
  CRITICAL: "Critical",
  NO_DATA: "No Data",
} as const;

export function tierBadge(tier: GuardMonthlyDetail["performanceTier"]) {
  return (
    <Badge tone={TIER_TONE[tier]} className="uppercase">
      {TIER_LABEL[tier]}
    </Badge>
  );
}

function getProgressColor(pct: number) {
  if (pct >= 95) return "bg-emerald-500";
  if (pct >= 85) return "bg-brand-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

type DayRow = GuardMonthlyDetail["logs"][number];

export function GuardMonthlyDetail({
  detail,
  basePath,
}: {
  detail: GuardMonthlyDetail;
  /** Where the month/year selectors navigate back to. */
  basePath: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const updateFilters = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${basePath}?${next.toString()}`);
  };

  const columns: Column<DayRow>[] = [
    {
      key: "date",
      header: "Date",
      cell: (r) => <span className="font-semibold text-slate-800">{formatDate(r.date)}</span>,
    },
    {
      key: "shift",
      header: "Shift",
      cell: (r) => <Badge tone={r.shift === "DAY" ? "brand" : "violet"}>{r.shift}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <Badge tone={statusTone(r.status)}>{r.status}</Badge>
          {r.status === "LATE" && r.minutesLate ? (
            <span className="text-xs font-semibold text-amber-700">+{r.minutesLate}m</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "category",
      header: "Absence Category",
      cell: (r) =>
        r.absenceCategory ? (
          <Badge tone={statusTone(r.absenceCategory)}>
            {r.absenceCategory.replaceAll("_", " ")}
            {r.allowedDays ? ` (${r.allowedDays}d)` : ""}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "reason",
      header: "Reason / Notes",
      cell: (r) => <span className="text-slate-600">{r.reason || "—"}</span>,
    },
    {
      key: "supervisor",
      header: "Recorded By",
      cell: (r) => <span className="text-slate-600">{r.supervisorName || "—"}</span>,
    },
  ];

  const pctColor = getProgressColor(detail.attendancePercentage);

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-600" />
          <select
            value={detail.month}
            onChange={(e) => updateFilters({ month: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={detail.year}
            onChange={(e) => updateFilters({ year: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <a href={basePath}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-linear-to-br from-brand-50 to-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
              Attendance
            </span>
            <Award className="h-5 w-5 text-brand-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">{detail.attendancePercentage}%</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${pctColor}`}
                style={{ width: `${Math.min(100, detail.attendancePercentage)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              On-time:{" "}
              <span className="font-semibold text-slate-700">{detail.onTimePercentage}%</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
            <span>Total Shifts</span>
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{detail.totalShifts}</p>
          <p className="mt-1 text-xs text-slate-400">recorded this month</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-800">
            <span>Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-900">{detail.presentCount}</p>
          <p className="mt-1 text-xs text-emerald-700">on-time clock-ins</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-800">
            <span>Late Arrivals</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-900">{detail.lateCount}</p>
          <p className="mt-1 text-xs font-medium text-amber-700">
            {detail.totalMinutesLate} min total delay
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-rose-800">
            <span>Absences</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-900">{detail.absentCount}</p>
          <p className="mt-1 text-[11px] text-rose-700">
            {detail.sickCount} sick · {detail.permittedCount} perm · {detail.notPermittedCount}{" "}
            unexcused
          </p>
        </div>
      </div>

      {/* Per-day log */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Daily Attendance Log — {detail.monthName} {detail.year}
          </h3>
          <p className="text-xs text-slate-500">
            Every recorded shift for {detail.guard.fullName} ({detail.guard.employeeId}) between{" "}
            {detail.startDate} and {detail.endDate}.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <DataTable
            columns={columns}
            rows={detail.logs}
            empty="No attendance records for this month yet."
          />
        </div>
      </div>
    </div>
  );
}
