"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export type ShiftStatusSlice = {
  name: string;
  value: number;
  color: string;
};

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="font-medium text-slate-700">{data.name}:</span>
          <span className="font-bold text-slate-900">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function TodayShiftDonutChart({
  present,
  late,
  absent,
  unrecorded = 0,
}: {
  present: number;
  late: number;
  absent: number;
  unrecorded?: number;
}) {
  const total = present + late + absent + unrecorded;
  const attendanceRate =
    present + late + absent > 0
      ? Math.round(((present + late) / (present + late + absent)) * 100)
      : 0;

  const data: ShiftStatusSlice[] = [
    { name: "Present", value: present, color: "#10b981" },
    { name: "Late Arrivals", value: late, color: "#f59e0b" },
    { name: "Absences", value: absent, color: "#f43f5e" },
    ...(unrecorded > 0
      ? [{ name: "Pending", value: unrecorded, color: "#e2e8f0" }]
      : []),
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Today&apos;s Shift Breakdown
          </h3>
          <p className="text-xs text-slate-500">Live operational status distribution</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-500">Attendance</span>
          <p className="text-lg font-black text-slate-900">{attendanceRate}%</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 200 }}>
        {data.length === 0 ? (
          <div className="text-center text-xs text-slate-400">
            No shift records logged yet today.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">
                {present + late + absent}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Logged
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
        <div className="rounded-lg bg-emerald-50/60 p-1.5">
          <p className="font-bold text-emerald-700">{present}</p>
          <p className="text-[10px] font-medium text-emerald-600">Present</p>
        </div>
        <div className="rounded-lg bg-amber-50/60 p-1.5">
          <p className="font-bold text-amber-700">{late}</p>
          <p className="text-[10px] font-medium text-amber-600">Late</p>
        </div>
        <div className="rounded-lg bg-rose-50/60 p-1.5">
          <p className="font-bold text-rose-700">{absent}</p>
          <p className="text-[10px] font-medium text-rose-600">Absent</p>
        </div>
      </div>
    </div>
  );
}
