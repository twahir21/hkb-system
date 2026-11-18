import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { getMeetingScope, listInvitableStaff, listMeetings } from "@/features/meetings/queries/meetings";
import { listBranches } from "@/features/branches/queries/branches";
import { MeetingForm } from "@/features/meetings/components/MeetingForms";
import { meetingDate, meetingTimeRange } from "@/features/meetings/format";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const M = t.meetings;

  const sp = await searchParams;
  const past = sp.when === "past";
  const canManage = hasPermission(user.role, "MEETING_MANAGE");
  const scope = getMeetingScope(user);

  const [rows, staff, branches] = await Promise.all([
    listMeetings(scope, past ? "past" : "upcoming"),
    canManage ? listInvitableStaff() : Promise.resolve([]),
    canManage ? listBranches() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{M.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{M.subtitle}</p>
      </div>

      <div className={cn("grid gap-6", canManage && "xl:grid-cols-5")}>
        {canManage && (
          <div className="xl:col-span-2">
            <MeetingForm staff={staff} branches={branches} />
          </div>
        )}

        <div className={cn("space-y-3", canManage && "xl:col-span-3")}>
          <div className="flex gap-1 self-start rounded-xl bg-slate-100 p-1 text-xs font-semibold w-fit">
            <Link href="/meetings" className={cn("rounded-lg px-3 py-1.5", !past ? "bg-white shadow-sm" : "text-slate-500")}>
              {M.upcoming}
            </Link>
            <Link
              href="/meetings?when=past"
              className={cn("rounded-lg px-3 py-1.5", past ? "bg-white shadow-sm" : "text-slate-500")}
            >
              {M.past}
            </Link>
          </div>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.map((m) => (
              <li key={m.id}>
                <Link href={`/meetings/${m.id}`} className="flex flex-wrap items-start gap-4 px-4 py-3 hover:bg-slate-50">
                  <div className="w-36 shrink-0 text-sm">
                    <p className="font-semibold text-slate-800">{meetingDate(m.startsAt)}</p>
                    <p className="text-xs text-slate-500">{meetingTimeRange(m.startsAt, m.endsAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium text-slate-900", m.status === "CANCELLED" && "line-through text-slate-400")}>
                      {m.title}{" "}
                      {m.status === "CANCELLED" && <Badge tone="rose">{M.cancelled}</Badge>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[m.venue, m.onlineLink ? M.onlineLink : null].filter(Boolean).join(" · ")} ·{" "}
                      {m.branchName ?? M.allBranches}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <p>
                      {m.inviteeCount} {M.people}
                    </p>
                    {m.organiserName && <p className="text-slate-400">{m.organiserName}</p>}
                  </div>
                </Link>
              </li>
            ))}
            {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">{M.none}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
