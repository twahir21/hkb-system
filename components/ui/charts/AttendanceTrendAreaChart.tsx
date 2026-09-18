"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type TrendDataPoint = {
  date: string;
  dayLabel: string;
  present: number;
  late: number;
  absent: number;
  total?: number;
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const total = payload.reduce(
      (sum: number, p: any) => sum + (Number(p.value) || 0),
      0
    );
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-xs text-xs">
        <p className="font-bold text-slate-800 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={`tooltip-item-${index}`}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-1 mt-1 flex justify-between text-slate-500 font-semibold">
            <span>Total Logged:</span>
            <span className="text-slate-900">{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function AttendanceTrendAreaChart({
  data,
  title = "Attendance Trend",
  subtitle = "Daily distribution of Present, Late, and Absent records",
  height = 280,
}: {
  data: TrendDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradientPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradientLate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradientAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dayLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            />
            <Area
              type="monotone"
              dataKey="present"
              name="Present"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradientPresent)"
            />
            <Area
              type="monotone"
              dataKey="late"
              name="Late"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gradientLate)"
            />
            <Area
              type="monotone"
              dataKey="absent"
              name="Absent"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gradientAbsent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
