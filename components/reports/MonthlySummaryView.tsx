"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileDown,
  Award,
} from "lucide-react";
import { Badge, Button, DataTable, type Column } from "@/components/ui";
import type { OverallMonthlySummary, GuardMonthlyStat } from "@/lib/queries/monthly-summary";

type SupervisorOpt = { id: string; name: string; role: string };

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

export function MonthlySummaryView({
  summary,
  supervisors,
}: {
  summary: OverallMonthlySummary;
  supervisors: SupervisorOpt[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");

  const updateFilters = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`/reports?${next.toString()}`);
  };

  const currentYear = summary.year;
  const currentMonth = summary.month;

  const pdfUrl = `/api/reports/pdf?startDate=${summary.startDate}&endDate=${summary.endDate}&format=pdf`;

  const filteredGuards = summary.guards.filter((g) => {
    const matchesQ =
      !q ||
      g.fullName.toLowerCase().includes(q.toLowerCase()) ||
      g.employeeId.toLowerCase().includes(q.toLowerCase()) ||
      g.workLocation.toLowerCase().includes(q.toLowerCase());

    const matchesTier = !tierFilter || g.performanceTier === tierFilter;
    return matchesQ && matchesTier;
  });

  const getTierBadge = (tier: GuardMonthlyStat["performanceTier"]) => {
    switch (tier) {
      case "EXCELLENT":
        return <Badge tone="emerald">Excellent (≥95%)</Badge>;
      case "GOOD":
        return <Badge tone="brand">Good (85-94%)</Badge>;
      case "WARNING":
        return <Badge tone="amber">Warning (70-84%)</Badge>;
      case "CRITICAL":
        return <Badge tone="rose">Critical (&lt;70%)</Badge>;
      default:
        return <Badge tone="slate">No Shifts</Badge>;
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 95) return "bg-emerald-500";
    if (pct >= 85) return "bg-brand-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  type TableRow = GuardMonthlyStat & { id: string };

  const columns: Column<TableRow>[] = [
    {
      key: "guard",
      header: "Guard & Station",
      cell: (r) => (
        <div>
          <a
            href={`/reports/guards/${r.guardId}?month=${summary.month}&year=${summary.year}`}
            className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
          >
            {r.fullName}
          </a>
          <p className="font-mono text-xs text-slate-500">{r.employeeId} · {r.workLocation}</p>
        </div>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      cell: (r) => <span className="text-xs text-slate-600">{r.supervisorName ?? "—"}</span>,
    },
    {
      key: "shifts",
      header: "Shifts",
      cell: (r) => <span className="font-semibold text-slate-800">{r.totalShifts}</span>,
    },
    {
      key: "present",
      header: "Present",
      cell: (r) => (
        <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
          {r.presentCount}
        </span>
      ),
    },
    {
      key: "late",
      header: "Late Arrivals",
      cell: (r) => (
        <div>
          {r.lateCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs">
              <Clock className="h-3 w-3 text-amber-600" />
              {r.lateCount} ({r.totalMinutesLate}m)
            </span>
          ) : (
            <span className="text-xs text-slate-400">0</span>
          )}
        </div>
      ),
    },
    {
      key: "absent",
      header: "Absences",
      cell: (r) => (
        <div className="text-xs">
          {r.absentCount > 0 ? (
            <div className="flex items-center gap-1">
              <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                {r.absentCount}
              </span>
              <span className="text-[11px] text-slate-400">
                ({r.sickCount}s · {r.permittedCount}p · {r.notPermittedCount}u)
              </span>
            </div>
          ) : (
            <span className="text-slate-400">0</span>
          )}
        </div>
      ),
    },
    {
      key: "attendancePct",
      header: "Attendance Rate %",
      cell: (r) => (
        <div className="w-36">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-slate-800">{r.attendancePercentage}%</span>
            {getTierBadge(r.performanceTier)}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(r.attendancePercentage)}`}
              style={{ width: `${Math.min(100, r.attendancePercentage)}%` }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Month & Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            <select
              value={currentMonth}
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
              value={currentYear}
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

          <select
            value={sp.get("supervisorId") ?? ""}
            onChange={(e) => updateFilters({ supervisorId: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Supervisors</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <a href={pdfUrl} download>
            <Button size="sm">
              <FileDown className="h-4 w-4" /> Download Month PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Overall KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Overall Attendance Percentage */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-linear-to-br from-brand-50 to-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
              Monthly Attendance
            </span>
            <Award className="h-5 w-5 text-brand-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">
              {summary.overallAttendancePercentage}%
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${getProgressColor(summary.overallAttendancePercentage)}`}
                style={{ width: `${Math.min(100, summary.overallAttendancePercentage)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              On-time: <span className="font-semibold text-slate-700">{summary.overallOnTimePercentage}%</span>
            </p>
          </div>
        </div>

        {/* Total Expected / Logged Shifts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Shifts</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{summary.totalShifts}</p>
          <p className="mt-1 text-xs text-slate-400">across {summary.totalGuards} active guards</p>
        </div>

        {/* Present Days */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
            <span>Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-900">{summary.presentCount}</p>
          <p className="mt-1 text-xs text-emerald-700">on-time clock-ins</p>
        </div>

        {/* Late Arrivals */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase">
            <span>Late Arrivals</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-900">{summary.lateCount}</p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            {summary.totalMinutesLate} min total delay
          </p>
        </div>

        {/* Absences */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase">
            <span>Absences</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-900">{summary.absentCount}</p>
          <p className="mt-1 text-[11px] text-rose-700">
            {summary.sickCount} sick · {summary.permittedCount} perm · {summary.notPermittedCount} unexcused
          </p>
        </div>
      </div>

      {/* Individual Guard Attendance Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Individual Guard Attendance Breakdown — {summary.monthName} {summary.year}
            </h3>
            <p className="text-xs text-slate-500">
              Detailed shift statistics and attendance percentages per employee.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search guard or location…"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:w-60 focus:border-brand-500 focus:outline-none"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Tiers</option>
              <option value="EXCELLENT">Excellent (≥95%)</option>
              <option value="GOOD">Good (85-94%)</option>
              <option value="WARNING">Warning (70-84%)</option>
              <option value="CRITICAL">Critical (&lt;70%)</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <DataTable
            columns={columns}
            rows={filteredGuards.map((g): TableRow => ({ ...g, id: g.guardId }))}
            empty="No guard records found for this month."
          />
        </div>
      </div>
    </div>
  );
}
