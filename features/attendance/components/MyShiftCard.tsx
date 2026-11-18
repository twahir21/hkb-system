import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { Badge, Card, statusTone } from "@/components/ui";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MyShiftStatus } from "@/features/attendance/queries/my-shift";

type Log = NonNullable<MyShiftStatus["todayLogs"]["DAY"]>;

function statusLabel(log: Log | null) {
  const S = t.myShift;
  if (!log) return S.notRecorded;
  if (log.status === "LATE") return log.minutesLate ? `${S.status.LATE} (${log.minutesLate} ${S.minutes})` : S.status.LATE;
  if (log.status === "ABSENT" && log.absenceCategory) return `${S.status.ABSENT} · ${S.absence[log.absenceCategory]}`;
  return S.status[log.status];
}

function ShiftTile({ label, icon, log }: { label: string; icon: React.ReactNode; log: Log | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Badge tone={log ? statusTone(log.status) : "slate"}>{statusLabel(log)}</Badge>
      </div>
    </div>
  );
}

const DOT: Record<Log["status"], string> = {
  PRESENT: "bg-emerald-500",
  LATE: "bg-amber-500",
  ABSENT: "bg-rose-500",
};

/** Guard / In-Charge dashboard: own shift status today plus the last 7 days. */
export function MyShiftCard({ data }: { data: MyShiftStatus | null }) {
  const S = t.myShift;
  if (!data) {
    return (
      <Card title={S.title}>
        <p className="text-sm text-slate-500">{S.noProfile}</p>
      </Card>
    );
  }

  return (
    <Card
      title={S.title}
      subtitle={`${data.today.split("-").reverse().join("/")} · ${S.post}: ${data.post}`}
      action={
        <Link href="/my-summary" className="text-xs font-semibold text-brand-600 hover:underline">
          {S.monthSummary} →
        </Link>
      }
    >
      <div className="space-y-4">
        {data.leaveToday && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800">
            {t.leave.onLeave}: {t.leave.types[data.leaveToday]}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <ShiftTile label={S.day} icon={<Sun className="h-4 w-4" />} log={data.todayLogs.DAY} />
          <ShiftTile label={S.night} icon={<Moon className="h-4 w-4" />} log={data.todayLogs.NIGHT} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{S.lastWeek}</p>
          <ol className="grid grid-cols-7 gap-1 text-center">
            {data.week.map((d) => {
              const weekday = new Date(`${d.date}T12:00:00Z`).getUTCDay();
              return (
                <li
                  key={d.date}
                  className={cn("rounded-lg border border-slate-100 py-1.5", d.date === data.today && "border-brand-300 bg-brand-50")}
                  title={
                    d.logs.length
                      ? d.logs.map((l) => `${l.shift === "DAY" ? S.day : S.night}: ${statusLabel(l)}`).join(" · ")
                      : S.notRecorded
                  }
                >
                  <p className="text-[10px] font-semibold text-slate-500">{t.calendar.weekdays[(weekday + 6) % 7]}</p>
                  <p className="text-xs text-slate-700">{Number(d.date.slice(8))}</p>
                  <div className="mt-1 flex h-2 justify-center gap-0.5">
                    {d.logs.map((l) => (
                      <span key={l.shift} className={cn("h-2 w-2 rounded-full", DOT[l.status])} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {data.supervisorName && (
          <p className="text-xs text-slate-500">
            {S.supervisor}: <span className="font-medium text-slate-700">{data.supervisorName}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
