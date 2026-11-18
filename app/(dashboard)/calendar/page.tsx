import { getCurrentUser } from "@/lib/auth/dal";
import { t } from "@/lib/i18n";
import { MonthCalendar, monthBounds, parseMonth, type CalendarEvent } from "@/components/ui/MonthCalendar";
import { getLeaveScope, listLeaveForMonth } from "@/features/leave/queries/leave";
import { leaveToEvent } from "@/features/leave/components/LeaveCalendar";
import { getMeetingScope, listMeetingsForMonth } from "@/features/meetings/queries/meetings";
import { eatDay, meetingTime } from "@/features/meetings/format";
import { getTrainingScope, listTrainingsForMonth } from "@/features/trainings/queries/trainings";

/**
 * One month of meetings, trainings and approved leave, each inside the viewer's own scope
 * (meetings: invited / all for HQ office; leave: own / branch / all).
 * Trainings (violet): company-wide + own branch; HQ office sees all.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const C = t.calendar;

  const sp = await searchParams;
  const today = eatDay(new Date());
  const month = parseMonth(sp.month, today.slice(0, 7));

  const { first, last } = monthBounds(month);
  const [leaveScope, trainingScope] = await Promise.all([getLeaveScope(user), getTrainingScope(user)]);
  const [meetingRows, leaveRows, trainingRows] = await Promise.all([
    getMeetingScope(user).then((scope) => listMeetingsForMonth(scope, month)),
    listLeaveForMonth(leaveScope, month),
    listTrainingsForMonth(trainingScope, first, last),
  ]);

  const events: CalendarEvent[] = [
    ...meetingRows.map((m): CalendarEvent => {
      const day = eatDay(m.startsAt);
      const cancelled = m.status === "CANCELLED";
      return {
        id: `meeting-${m.id}`,
        start: day,
        end: day,
        label: `${meetingTime(m.startsAt)} ${m.title}`,
        title: `${C.meetings}: ${m.title} · ${meetingTime(m.startsAt)}${cancelled ? ` · ${C.cancelled}` : ""}`,
        tone: "brand",
        struck: cancelled,
        href: `/meetings/${m.id}`,
      };
    }),
    ...trainingRows.map((tr): CalendarEvent => {
      const cancelled = tr.status === "CANCELLED";
      return {
        id: `training-${tr.id}`,
        start: tr.startDate,
        end: tr.endDate,
        label: tr.title,
        title: `${C.trainings}: ${tr.title} · ${tr.trainer} · ${tr.venue}${cancelled ? ` · ${C.cancelled}` : ""}`,
        tone: "violet",
        struck: cancelled,
        href: "/trainings",
      };
    }),
    ...leaveRows.filter((l) => l.status === "APPROVED").map(leaveToEvent),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{C.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{C.subtitle}</p>
      </div>
      <MonthCalendar
        month={month}
        today={today}
        events={events}
        monthHref={(m) => `/calendar?month=${m}`}
        legend={[
          { label: C.meetings, tone: "brand" },
          { label: C.trainings, tone: "violet" },
          { label: C.leave, tone: "emerald" },
        ]}
      />
    </div>
  );
}
