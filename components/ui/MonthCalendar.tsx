import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CalendarTone = "emerald" | "amber" | "brand" | "violet" | "slate";

export type CalendarEvent = {
  id: string;
  /** Inclusive YYYY-MM-DD range (single-day events: start === end). */
  start: string;
  end: string;
  label: string;
  /** Tooltip text. */
  title?: string;
  tone: CalendarTone;
  /** Dashed outline (e.g. pending) instead of a filled chip. */
  dashed?: boolean;
  /** Struck through (e.g. cancelled). */
  struck?: boolean;
  href?: string;
};

export type CalendarLegendItem = { label: string; tone: CalendarTone; dashed?: boolean };

const FILLED: Record<CalendarTone, string> = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  brand: "bg-brand-100 text-brand-800",
  violet: "bg-violet-100 text-violet-800",
  slate: "bg-slate-100 text-slate-500",
};
const DASHED: Record<CalendarTone, string> = {
  emerald: "border border-dashed border-emerald-400 bg-emerald-50 text-emerald-800",
  amber: "border border-dashed border-amber-400 bg-amber-50 text-amber-800",
  brand: "border border-dashed border-brand-400 bg-brand-50 text-brand-800",
  violet: "border border-dashed border-violet-400 bg-violet-50 text-violet-800",
  slate: "border border-dashed border-slate-300 bg-slate-50 text-slate-500",
};
const SWATCH: Record<CalendarTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  brand: "bg-brand-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

const MAX_PER_DAY = 3;

/** Shift a YYYY-MM month by delta months. */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First and last YYYY-MM-DD of a YYYY-MM month. */
export function monthBounds(month: string): { first: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${month}-01`, last: `${month}-${String(days).padStart(2, "0")}` };
}

/** Valid ?month=YYYY-MM or the fallback. */
export function parseMonth(value: string | undefined, fallback: string): string {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback;
}

/**
 * Server-rendered Monday-first month grid. Navigation uses plain links:
 * `monthHref(month)` builds the URL for another month.
 */
export function MonthCalendar({
  month,
  today,
  events,
  monthHref,
  legend = [],
  summary,
}: {
  month: string; // YYYY-MM
  today: string; // YYYY-MM-DD
  events: CalendarEvent[];
  monthHref: (month: string) => string;
  legend?: CalendarLegendItem[];
  summary?: ReactNode;
}) {
  const C = t.calendar;
  const [y, m] = month.split("-").map(Number);
  const { last } = monthBounds(month);
  const daysInMonth = Number(last.slice(8));
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const navCls = "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm hover:bg-slate-100";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href={monthHref(shiftMonth(month, -1))} className={navCls} aria-label={C.prev}>
            ‹
          </Link>
          <h4 className="min-w-36 text-center font-semibold text-slate-900">
            {C.months[m - 1]} {y}
          </h4>
          <Link href={monthHref(shiftMonth(month, 1))} className={navCls} aria-label={C.next}>
            ›
          </Link>
          {today.slice(0, 7) !== month && (
            <Link href={monthHref(today.slice(0, 7))} className="text-xs font-semibold text-brand-700 hover:underline">
              {C.today}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-sm",
                  l.dashed ? cn("border border-dashed", DASHED[l.tone]) : SWATCH[l.tone]
                )}
              />
              {l.label}
            </span>
          ))}
          {summary && <span className="font-semibold">{summary}</span>}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {C.weekdays.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`x${i}`} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50" />;
          const list = events.filter((e) => e.start <= date && e.end >= date);
          const extra = list.length - MAX_PER_DAY;
          return (
            <div key={date} className={cn("min-h-24 border-b border-r border-slate-100 p-1.5", date === today && "bg-brand-50/60")}>
              <div className={cn("mb-1 text-xs font-semibold text-slate-500", date === today && "text-brand-700")}>
                {Number(date.slice(8))}
              </div>
              <ul className="space-y-0.5">
                {list.slice(0, MAX_PER_DAY).map((e) => {
                  const cls = cn(
                    "block truncate rounded px-1 py-0.5 text-[11px] leading-tight",
                    e.dashed ? DASHED[e.tone] : FILLED[e.tone],
                    e.struck && "line-through opacity-70",
                    e.href && "hover:ring-1 hover:ring-slate-300"
                  );
                  return (
                    <li key={e.id} title={e.title ?? e.label}>
                      {e.href ? (
                        <Link href={e.href} className={cls}>
                          {e.label}
                        </Link>
                      ) : (
                        <span className={cls}>{e.label}</span>
                      )}
                    </li>
                  );
                })}
                {extra > 0 && (
                  <li className="px-1 text-[11px] text-slate-500" title={list.slice(MAX_PER_DAY).map((e) => e.label).join(", ")}>
                    +{extra} {C.more}
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
