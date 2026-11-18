"use client";

import { t } from "@/lib/i18n";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TierDistribution } from "@/lib/queries/monthly-summary";
import type { ChartTooltipProps } from "./chart-tooltip.types";

const TIER_CONFIG = [
  { key: "excellent", short: t.status.EXCELLENT, label: `${t.status.EXCELLENT} (≥95%)`, color: "#10b981" },
  { key: "good", short: t.status.GOOD, label: `${t.status.GOOD} (85-94%)`, color: "#6366f1" },
  { key: "warning", short: t.status.WARNING, label: `${t.status.WARNING} (70-84%)`, color: "#f59e0b" },
  { key: "critical", short: t.status.CRITICAL, label: `${t.status.CRITICAL} (<70%)`, color: "#f43f5e" },
  { key: "noData", short: t.status.NO_SHIFTS, label: t.status.NO_SHIFTS, color: "#94a3b8" },
] as const;

function CustomTooltip({ active, payload }: ChartTooltipProps<{ color: string }>) {
  const entry = payload?.[0];
  if (active && entry) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xs text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.payload?.color }}
          />
          <span className="font-medium text-slate-700">{entry.name}:</span>
          <span className="font-bold text-slate-900">{entry.value} {t.charts.guards}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function PerformanceTierDonutChart({
  distribution,
  totalGuards,
}: {
  distribution: TierDistribution;
  totalGuards: number;
}) {
  const data = TIER_CONFIG.map((c) => ({
    name: c.label,
    value: distribution[c.key as keyof TierDistribution] || 0,
    color: c.color,
  })).filter((d) => d.value > 0);

  const activeCount =
    (distribution.excellent || 0) +
    (distribution.good || 0) +
    (distribution.warning || 0) +
    (distribution.critical || 0);

  const highPerformers = (distribution.excellent || 0) + (distribution.good || 0);
  const highPerfPct =
    activeCount > 0 ? Math.round((highPerformers / activeCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            {t.charts.tierTitle}
          </h3>
          <p className="text-xs text-slate-500">{t.charts.tierSub}</p>
        </div>
        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
          {highPerfPct}% {t.status.GOOD}+
        </span>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 190 }}>
        {data.length === 0 ? (
          <div className="text-center text-xs text-slate-400">{t.charts.tierEmpty}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={74}
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
              <span className="text-2xl font-black text-slate-900">{totalGuards}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t.charts.guardsTitle}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-3 text-xs">
        {TIER_CONFIG.map((c) => {
          const val = distribution[c.key as keyof TierDistribution] || 0;
          return (
            <div
              key={c.key}
              className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 text-slate-600 truncate text-[11px]">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                {c.short}
              </span>
              <span className="font-bold text-slate-900">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
