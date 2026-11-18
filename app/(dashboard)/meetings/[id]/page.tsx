import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/rbac";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import { getMeeting, getMeetingScope } from "@/features/meetings/queries/meetings";
import { CancelMeetingButton } from "@/features/meetings/components/MeetingForms";
import { meetingDate, meetingHasEnded, meetingTimeRange } from "@/features/meetings/format";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const M = t.meetings;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const meeting = await getMeeting(getMeetingScope(user), id);
  if (!meeting) notFound();

  const canManage = hasPermission(user.role, "MEETING_MANAGE");
  const cancelled = meeting.status === "CANCELLED";
  const isPast = meetingHasEnded(meeting.startsAt, meeting.endsAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/meetings" className="text-xs text-slate-500 hover:underline">
            ← {M.back}
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {meeting.title} {cancelled && <Badge tone="rose">{M.cancelled}</Badge>}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {meetingDate(meeting.startsAt)} · {meetingTimeRange(meeting.startsAt, meeting.endsAt)} (EAT) ·{" "}
            {meeting.branchName ?? M.allBranches}
          </p>
        </div>
        {canManage && !cancelled && !isPast && <CancelMeetingButton id={meeting.id} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title={M.agenda}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{meeting.agenda}</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={M.venue}>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{M.venue}</dt>
                <dd className="text-slate-800">{meeting.venue ?? "—"}</dd>
              </div>
              {meeting.onlineLink && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{M.onlineLink}</dt>
                  <dd>
                    {cancelled ? (
                      <span className="break-all text-slate-400">{meeting.onlineLink}</span>
                    ) : (
                      <a
                        href={meeting.onlineLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-semibold text-brand-700 hover:underline"
                      >
                        {M.join} ↗
                      </a>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{M.organiser}</dt>
                <dd className="text-slate-800">{meeting.organiserName ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card title={`${M.invitees} (${meeting.invitees.length})`}>
            <ul className="divide-y divide-slate-100 text-sm">
              {meeting.invitees.map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="truncate text-slate-800">{p.fullName}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {ROLE_LABELS[p.role]}
                    {p.branchName ? ` · ${p.branchName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
