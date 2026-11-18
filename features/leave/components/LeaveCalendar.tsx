import { t } from "@/lib/i18n";
import { MonthCalendar, type CalendarEvent } from "@/components/ui/MonthCalendar";
import type { LeaveCalendarEntry } from "@/features/leave/queries/leave";

/** Calendar event for one leave request (approved = filled green, pending = dashed amber). */
export function leaveToEvent(e: LeaveCalendarEntry): CalendarEvent {
  const L = t.leave;
  return {
    id: `leave-${e.id}`,
    start: e.startDate,
    end: e.endDate,
    label: e.employeeName,
    title: `${e.employeeName} — ${L.types[e.type]} (${e.startDate} – ${e.endDate}) · ${L.statuses[e.status]}`,
    tone: e.status === "APPROVED" ? "emerald" : "amber",
    dashed: e.status !== "APPROVED",
  };
}

/** Month grid (Mon–Sun) of approved and pending leave. Server-rendered. */
export function LeaveCalendar({
  month,
  entries,
  today,
}: {
  month: string; // YYYY-MM
  entries: LeaveCalendarEntry[];
  today: string; // YYYY-MM-DD
}) {
  const L = t.leave;
  const approvedPeople = new Set(entries.filter((e) => e.status === "APPROVED").map((e) => e.userId)).size;

  return (
    <MonthCalendar
      month={month}
      today={today}
      events={entries.map(leaveToEvent)}
      monthHref={(m) => `/leave?view=calendar&month=${m}`}
      legend={[
        { label: L.statuses.APPROVED, tone: "emerald" },
        { label: L.statuses.PENDING, tone: "amber", dashed: true },
      ]}
      summary={`${approvedPeople} ${L.calendar.onLeaveThisMonth}`}
    />
  );
}
