"use client";

import { useMemo } from "react";
import type { LogRow } from "@/features/attendance/queries/attendance";
import { formatDate } from "@/lib/utils";

export function ShiftHeatmapStrip({
  year,
  month,
  logs,
}: {
  year: number;
  month: number;
  logs: LogRow[];
}) {
  const paddedMonth = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();

  const logsByDate = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const log of logs) {
      const list = map.get(log.date) || [];
      list.push(log);
      map.set(log.date, list);
    }
    return map;
  }, [logs]);

  const days = Array.from({ length: lastDay }, (_, i) => {
    const day = i + 1;
    const iso = `${year}-${paddedMonth}-${String(day).padStart(2, "0")}`;
    const dayLogs = logsByDate.get(iso) || [];

    let status: "PRESENT" | "LATE" | "ABSENT" | "REST" = "REST";
    let desc = "No scheduled shift";

    if (dayLogs.length > 0) {
      const primary = dayLogs[0];
      status = primary.status;
      if (primary.status === "PRESENT") {
        desc = `Present (${primary.shift} shift)`;
      } else if (primary.status === "LATE") {
        desc = `Late by ${primary.minutesLate || 0}m (${primary.shift} shift)`;
      } else if (primary.status === "ABSENT") {
        desc = `Absent: ${primary.absenceCategory || "Not Permitted"} (${primary.shift} shift)`;
      }
    }

    return { day, iso, status, desc, count: dayLogs.length };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "bg-emerald-500 text-white hover:bg-emerald-600 ring-emerald-300";
      case "LATE":
        return "bg-amber-400 text-slate-900 hover:bg-amber-500 ring-amber-300";
      case "ABSENT":
        return "bg-rose-500 text-white hover:bg-rose-600 ring-rose-300";
      default:
        return "bg-slate-100 text-slate-400 hover:bg-slate-200 ring-slate-200";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            30-Day Shift Heatmap Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Day-by-day shift attendance progression for this month
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Absent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-300" /> Off
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1.5">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${formatDate(d.iso)}: ${d.desc}`}
            className={`group relative flex flex-col items-center justify-center rounded-xl p-2 font-mono text-xs transition cursor-pointer ${getStatusColor(
              d.status
            )}`}
          >
            <span className="font-bold">{d.day}</span>
            <span className="text-[9px] uppercase tracking-tighter opacity-80">
              {d.status === "REST" ? "off" : d.status.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
