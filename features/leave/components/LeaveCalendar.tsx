import Link from "next/link";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LeaveCalendarEntry } from "@/features/leave/queries/leave";

const MAX_PER_DAY = 3;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Month grid (Mon–Sun) of approved and pending leave. Server-rendered. */
export function LeaveCalendar({
  month,
  entries,
  today,
  basePath = "/leave?view=calendar",
}: {
  month: string; // YYYY-MM
  entries: LeaveCalendarEntry[];
  today: string; // YYYY-MM-DD
  basePath?: string;
}) {
  const L = t.leave;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday-first offset of day 1.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const onDay = (date: string) => entries.filter((e) => e.startDate <= date && e.endDate >= date);
  const approvedPeople = new Set(entries.filter((e) => e.status === "APPROVED").map((e) => e.userId)).size;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}&month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm hover:bg-slate-100"
            aria-label={L.calendar.prev}
          >
            ‹
          </Link>
          <h4 className="min-w-36 text-center font-semibold text-slate-900">
            {L.calendar.months[m - 1]} {y}
          </h4>
          <Link
            href={`${basePath}&month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm hover:bg-slate-100"
            aria-label={L.calendar.next}
          >
            ›
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> {L.statuses.APPROVED}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-amber-500 bg-amber-50" />{" "}
            {L.statuses.PENDING}
          </span>
          <span className="font-semibold">
            {approvedPeople} {L.calendar.onLeaveThisMonth}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {L.calendar.weekdays.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`x${i}`} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50" />;
          const list = onDay(date);
          const extra = list.length - MAX_PER_DAY;
          return (
            <div
              key={date}
              className={cn(
                "min-h-24 border-b border-r border-slate-100 p-1.5",
                date === today && "bg-brand-50/60"
              )}
            >
              <div className={cn("mb-1 text-xs font-semibold text-slate-500", date === today && "text-brand-700")}>
                {Number(date.slice(8))}
              </div>
              <ul className="space-y-0.5">
                {list.slice(0, MAX_PER_DAY).map((e) => (
                  <li
                    key={e.id}
                    title={`${e.employeeName} — ${L.types[e.type]} (${e.startDate} – ${e.endDate}) · ${L.statuses[e.status]}`}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px] leading-tight",
                      e.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "border border-dashed border-amber-400 bg-amber-50 text-amber-800"
                    )}
                  >
                    {e.employeeName}
                  </li>
                ))}
                {extra > 0 && (
                  <li
                    className="px-1 text-[11px] text-slate-500"
                    title={list.slice(MAX_PER_DAY).map((e) => e.employeeName).join(", ")}
                  >
                    +{extra} {L.calendar.more}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
