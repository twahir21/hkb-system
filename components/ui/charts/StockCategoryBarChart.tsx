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
import type { StationReportRow } from "@/features/store/queries/stock";

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
              <span className="font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function StockCategoryBarChart({ rows }: { rows: StationReportRow[] }) {
  // Aggregate quantities by item
  const itemMap = new Map<
    string,
    { holding: number; issued: number; lost: number; returned: number }
  >();

  for (const r of rows) {
    const entry = itemMap.get(r.itemName) || {
      holding: 0,
      issued: 0,
      lost: 0,
      returned: 0,
    };
    entry.holding += r.holding;
    entry.issued += r.issued;
    entry.lost += r.lost;
    entry.returned += r.returned;
    itemMap.set(r.itemName, entry);
  }

  const chartData = Array.from(itemMap.entries())
    .map(([itemName, stat]) => ({
      name: itemName.length > 15 ? itemName.slice(0, 13) + "…" : itemName,
      fullName: itemName,
      holding: stat.holding,
      issued: stat.issued,
      lost: stat.lost,
      returned: stat.returned,
    }))
    .slice(0, 10);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Inventory &amp; Movement Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Current holdings, issued, and lost items across filtered stations
          </p>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No stock movement data available for this selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
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
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
              />
              <Bar dataKey="holding" name="Holding" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="issued" name="Given Out" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lost" name="Lost / Deficit" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="returned"
                name="Returned"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
