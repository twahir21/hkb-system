"use client";

import { t } from "@/lib/i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartTooltipProps } from "./chart-tooltip.types";

function CustomTooltip({
  active,
  payload,
}: ChartTooltipProps<{ category: string; count: number }>) {
  const data = payload?.[0]?.payload;
  if (active && data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs">
        <p className="font-bold text-slate-800">{data.category}</p>
        <p className="text-slate-600 mt-0.5">
          {t.charts.count}: <span className="font-bold text-slate-900">{data.count}</span> {t.charts.shifts}
        </p>
      </div>
    );
  }
  return null;
}

export function AbsenceBreakdownBarChart({
  sickCount,
  permittedCount,
  notPermittedCount,
}: {
  sickCount: number;
  permittedCount: number;
  notPermittedCount: number;
}) {
  const data = [
    { category: t.charts.sick, count: sickCount, color: "#38bdf8" },
    { category: t.charts.permitted, count: permittedCount, color: "#a855f7" },
    { category: t.charts.unexcused, count: notPermittedCount, color: "#f43f5e" },
  ];

  const totalAbsences = sickCount + permittedCount + notPermittedCount;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            {t.charts.absenceTitle}
          </h3>
          <p className="text-xs text-slate-500">{t.charts.absenceSub}</p>
        </div>
        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg">
          {totalAbsences} {t.charts.total}
        </span>
      </div>

      <div style={{ width: "100%", height: 190 }}>
        {totalAbsences === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            {t.charts.noAbsences}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="category"
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
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
        <div className="rounded-lg bg-sky-50/60 p-1.5">
          <p className="font-bold text-sky-700">{sickCount}</p>
          <p className="text-[10px] font-medium text-sky-600">Sick</p>
        </div>
        <div className="rounded-lg bg-purple-50/60 p-1.5">
          <p className="font-bold text-purple-700">{permittedCount}</p>
          <p className="text-[10px] font-medium text-purple-600">Permitted</p>
        </div>
        <div className="rounded-lg bg-rose-50/60 p-1.5">
          <p className="font-bold text-rose-700">{notPermittedCount}</p>
          <p className="text-[10px] font-medium text-rose-600">Unexcused</p>
        </div>
      </div>
    </div>
  );
}
