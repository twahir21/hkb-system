"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SupervisorMonthlyStat } from "@/lib/queries/monthly-summary";

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xs text-xs">
        <p className="font-bold text-slate-900 mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={`tooltip-${index}`}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900">
                {entry.value}
                {entry.name === "Attendance Rate" ? "%" : " shifts"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function SupervisorComparisonBarChart({
  stats,
}: {
  stats: SupervisorMonthlyStat[];
}) {
  const displayData = stats.slice(0, 8).map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
    fullName: s.name,
    attendanceRate: s.attendancePercentage,
    totalShifts: s.shifts,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Supervisor Operational Comparison
          </h3>
          <p className="text-xs text-slate-500">
            Attendance rate and total shifts managed by supervisors
          </p>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        {displayData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No supervisor stats available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              />
              <Bar
                dataKey="attendanceRate"
                name="Attendance Rate (%)"
                fill="#4f46e5"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="totalShifts"
                name="Shifts Managed"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
