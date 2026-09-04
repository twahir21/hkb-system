"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Sun, Moon } from "lucide-react";
import { Badge, Button, statusTone } from "@/components/ui";
import { AbsentModal } from "./AbsentModal";
import { LateModal } from "./LateModal";
import { markPresentOnly } from "@/features/attendance/actions/attendance.actions";
import type { ShiftType } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export type LogDTO = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  absenceCategory: string | null;
  allowedDays: number | null;
  minutesLate: number | null;
  reason: string | null;
  documentUrl: string | null;
};

export type ShiftSheetRowDTO = {
  id: string;
  employeeId: string;
  fullName: string;
  workLocation: string;
  homeLocation: string | null;
  supervisorName: string | null;
  log: LogDTO | null;
};

const ABSENCE_LABEL: Record<string, string> = {
  SICK: "Sick",
  PERMITTED_REASON: "Permitted",
  NOT_PERMITTED: "Not Permitted",
};

export function ShiftSheet({
  date,
  shift,
  rows,
  supervisors,
  supervisorFilter,
  canRecord,
  canPii,
}: {
  date: string;
  shift: ShiftType;
  rows: ShiftSheetRowDTO[];
  supervisors: { id: string; name: string }[];
  supervisorFilter?: string;
  canRecord: boolean;
  canPii: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    router.replace(`/attendance?${next.toString()}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => update({ date: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              onClick={() => update({ shift: "DAY" })}
              className={
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium " +
                (shift === "DAY"
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              <Sun className="h-4 w-4" /> Day
            </button>
            <button
              onClick={() => update({ shift: "NIGHT" })}
              className={
                "inline-flex items-center gap-2 border-l border-slate-300 px-4 py-2 text-sm font-medium " +
                (shift === "NIGHT"
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              <Moon className="h-4 w-4" /> Night
            </button>
          </div>

          {supervisors.length > 1 && (
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supervisor
              </span>
              <select
                value={supervisorFilter ?? ""}
                onChange={(e) => update({ supervisorId: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All supervisors</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <p className="text-sm font-medium text-slate-600">
          {formatDate(date)} · {shift === "DAY" ? "Day" : "Night"} shift ·{" "}
          {rows.length} guards
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">Employee ID</th>
              <th className="px-4 py-3 font-semibold">Guard</th>
              <th className="px-4 py-3 font-semibold">Work Location</th>
              {canPii && <th className="px-4 py-3 font-semibold">Home</th>}
              <th className="px-4 py-3 font-semibold">Supervisor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Absence / Delay</th>
              {canRecord && (
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const hasLog = Boolean(row.log);
              const isPresent = row.log?.status === "PRESENT";
              const isLate = row.log?.status === "LATE";
              const absentCat = row.log?.absenceCategory ?? null;
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {row.employeeId}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.workLocation}
                  </td>
                  {canPii && (
                    <td className="px-4 py-3 text-slate-600">
                      {row.homeLocation ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600">
                    {row.supervisorName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {hasLog ? (
                      <Badge tone={statusTone(row.log!.status)}>
                        {row.log!.status}
                        {isLate && row.log!.minutesLate
                          ? ` (+${row.log!.minutesLate}m)`
                          : ""}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Not recorded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {absentCat ? (
                      <Badge tone={statusTone(absentCat)}>
                        {ABSENCE_LABEL[absentCat] ?? absentCat}
                      </Badge>
                    ) : isLate && row.log?.reason ? (
                      <span
                        className="text-xs text-slate-500 max-w-37.5 truncate block"
                        title={row.log.reason}
                      >
                        {row.log.reason}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  {canRecord && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {(!hasLog || !isPresent) && (
                          <form action={markPresentOnly}>
                            <input
                              type="hidden"
                              name="guardId"
                              value={row.id}
                            />
                            <input type="hidden" name="date" value={date} />
                            <input type="hidden" name="shift" value={shift} />
                            <input
                              type="hidden"
                              name="status"
                              value="PRESENT"
                            />
                            <Button type="submit" variant="success" size="sm">
                              Present
                            </Button>
                          </form>
                        )}
                        <LateModal
                          guardId={row.id}
                          guardName={row.fullName}
                          date={date}
                          shift={shift}
                          currentMinutesLate={row.log?.minutesLate}
                        />
                        <AbsentModal
                          guardId={row.id}
                          guardName={row.fullName}
                          date={date}
                          shift={shift}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
