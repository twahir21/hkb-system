"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@/lib/db/schema";
import type {
  StaffSheetRow,
  StaffHistoryRow,
} from "@/features/staff-attendance/queries/staff-attendance";
import { CheckCircle2, Clock, XCircle, TrendingUp, Award, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui";

function TooltipWrapper({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-xs text-xs">
        {label && <p className="font-bold text-slate-800 mb-1.5">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={`tooltip-${index}`}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function StaffAttendanceCharts({
  rows,
  historyLogs,
  selectedDate,
}: {
  rows: StaffSheetRow[];
  historyLogs: StaffHistoryRow[];
  selectedDate: string;
}) {
  // 1. Daily Donut Chart Data
  const donutData = useMemo(() => {
    const present = rows.filter((r) => r.log?.status === "PRESENT").length;
    const late = rows.filter((r) => r.log?.status === "LATE").length;
    const absent = rows.filter((r) => r.log?.status === "ABSENT").length;
    const unmarked = rows.filter((r) => !r.log).length;

    return [
      { name: "Present", value: present, color: "#10b981" },
      { name: "Late", value: late, color: "#f59e0b" },
      { name: "Absent", value: absent, color: "#f43f5e" },
      { name: "Unmarked", value: unmarked, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [rows]);

  const totalStaff = rows.length;
  const presentCount = rows.filter((r) => r.log?.status === "PRESENT").length;
  const lateCount = rows.filter((r) => r.log?.status === "LATE").length;
  const absentCount = rows.filter((r) => r.log?.status === "ABSENT").length;
  const attendanceRate = totalStaff > 0 ? Math.round(((presentCount + lateCount) / totalStaff) * 100) : 0;

  // 2. 14-Day Trend Data
  const trendData = useMemo(() => {
    // Generate dates for past 14 days
    const dates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    return dates.map((d) => {
      const logsOnDate = historyLogs.filter((l) => l.date === d);
      const present = logsOnDate.filter((l) => l.status === "PRESENT").length;
      const late = logsOnDate.filter((l) => l.status === "LATE").length;
      const absent = logsOnDate.filter((l) => l.status === "ABSENT").length;

      const dateObj = new Date(d);
      const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });

      return {
        date: d,
        dayLabel,
        Present: present,
        Late: late,
        Absent: absent,
      };
    });
  }, [historyLogs]);

  // 3. Attendance by Role Breakdown
  const roleData = useMemo(() => {
    const roles: Role[] = [
      "SUPER_ADMIN",
      "BURSAR",
      "SECRETARY",
      "STOREKEEPER",
      "HR",
      "SENIOR_SUPERVISOR",
      "OPERATION_OFFICER",
      "SUPERVISOR",
    ];

    const result: { role: string; present: number; late: number; absent: number; total: number; rate: number }[] = [];

    for (const r of roles) {
      const staffInRole = rows.filter((s) => s.role === r);
      if (staffInRole.length === 0) continue;

      const present = staffInRole.filter((s) => s.log?.status === "PRESENT").length;
      const late = staffInRole.filter((s) => s.log?.status === "LATE").length;
      const absent = staffInRole.filter((s) => s.log?.status === "ABSENT").length;
      const total = staffInRole.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      result.push({
        role: ROLE_LABELS[r] ?? r,
        present,
        late,
        absent,
        total,
        rate,
      });
    }

    return result;
  }, [rows]);

  // 4. Absence Category Breakdown
  const absenceData = useMemo(() => {
    const sick = historyLogs.filter((l) => l.absenceCategory === "SICK").length;
    const permitted = historyLogs.filter((l) => l.absenceCategory === "PERMITTED_REASON").length;
    const unauthorized = historyLogs.filter((l) => l.absenceCategory === "NOT_PERMITTED").length;

    return [
      { name: "Sick Leave", value: sick, color: "#38bdf8" },
      { name: "Permitted Leave", value: permitted, color: "#a855f7" },
      { name: "Unauthorized", value: unauthorized, color: "#f43f5e" },
    ].filter((d) => d.value > 0);
  }, [historyLogs]);

  return (
    <div className="space-y-6">
      {/* Top 2 Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Today&apos;s Attendance Split
              </h3>
              <p className="text-xs text-slate-400">Roll call distribution for {selectedDate}</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
              {attendanceRate}% Present
            </span>
          </div>

          <div className="relative h-56 w-full">
            {donutData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No attendance recorded for this date.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<TooltipWrapper />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Centered KPI in Donut */}
            {donutData.length > 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">{attendanceRate}%</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Attended
                </span>
              </div>
            )}
          </div>

          {/* Mini Badges Grid */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Present:</span>
              <span className="font-bold text-slate-900">{presentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Late:</span>
              <span className="font-bold text-slate-900">{lateCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600">Absent:</span>
              <span className="font-bold text-slate-900">{absentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600">Unmarked:</span>
              <span className="font-bold text-slate-900">
                {rows.length - (presentCount + lateCount + absentCount)}
              </span>
            </div>
          </div>
        </div>

        {/* 14-Day Multi-Area Trend Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                14-Day Staff Attendance Trend
              </h3>
              <p className="text-xs text-slate-400">Tracking daily presence, tardiness, and absences</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Late
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Absent
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip content={<TooltipWrapper />} />
                <Area type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#lateGrad)" />
                <Area type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#absentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom 2 Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance by Role Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Department / Role Attendance Breakdown
              </h3>
              <p className="text-xs text-slate-400">Comparing participation across roles for {selectedDate}</p>
            </div>
          </div>

          <div className="h-60 w-full">
            {roleData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No role data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="role"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<TooltipWrapper />} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Absence Reasons Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Absence Reasons Breakdown
              </h3>
              <p className="text-xs text-slate-400">Distribution of sick notes, permitted leaves, and unauthorized absences</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around h-60">
            {absenceData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No absence records logged in the system.
              </div>
            ) : (
              <>
                <div className="h-48 w-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={absenceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {absenceData.map((entry, index) => (
                          <Cell key={`abs-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<TooltipWrapper />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3 text-xs w-full sm:w-auto">
                  {absenceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-slate-700">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{item.value} times</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
