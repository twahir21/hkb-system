"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, DataTable, statusTone, type Column } from "@/components/ui";
import type { LogRow } from "@/lib/queries/attendance";

const ABSENCE_LABEL: Record<string, string> = {
  SICK: "Sick",
  PERMITTED_REASON: "Permitted",
  NOT_PERMITTED: "Not Permitted",
};

export function RecordsView({ logs }: { logs: LogRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchQ =
        !q ||
        l.guardName.toLowerCase().includes(q.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(q.toLowerCase());
      const matchS = status === "ALL" || l.status === status;
      return matchQ && matchS;
    });
  }, [logs, q, status]);

  const columns: Column<LogRow>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap text-slate-700">{r.date}</span> },
    { key: "shift", header: "Shift", cell: (r) => (
      <Badge tone={r.shift === "DAY" ? "amber" : "slate"}>{r.shift}</Badge>
    ) },
    { key: "guard", header: "Guard", cell: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.guardName}</p>
        <p className="font-mono text-xs text-slate-400">{r.employeeId}</p>
      </div>
    ) },
    { key: "status", header: "Status", cell: (r) => (
      <Badge tone={statusTone(r.status)}>
        {r.status}
        {r.status === "LATE" && r.minutesLate ? ` (+${r.minutesLate}m)` : ""}
      </Badge>
    ) },
    { key: "absence", header: "Absence / Delay", cell: (r) =>
      r.absenceCategory ? (
        <div>
          <Badge tone={statusTone(r.absenceCategory)}>{ABSENCE_LABEL[r.absenceCategory] ?? r.absenceCategory}</Badge>
          {r.allowedDays && <p className="mt-1 text-xs text-slate-400">{r.allowedDays} allowed days</p>}
        </div>
      ) : r.status === "LATE" && r.reason ? (
        <span className="text-xs text-slate-600 max-w-[150px] truncate block" title={r.reason}>
          {r.reason}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ) },
    { key: "supervisor", header: "Recorded by", cell: (r) => <span className="text-slate-600">{r.supervisorName || "—"}</span> },
    { key: "doc", header: "Doc", cell: (r) =>
      r.documentUrl ? (
        <a href={r.documentUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
          View
        </a>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or employee ID"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "PRESENT", "LATE", "ABSENT"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                "rounded-lg border px-3 py-2 text-sm font-medium " +
                (status === s
                  ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50")
              }
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} empty="No attendance records match your filters." />
      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {logs.length} records
      </p>
    </div>
  );
}