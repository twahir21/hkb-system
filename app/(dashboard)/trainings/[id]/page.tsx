import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { canManageBranch, getManageBranchLimit } from "@/lib/auth/branch-limit";
import { t } from "@/lib/i18n";
import { Badge, Card } from "@/components/ui";
import {
  getTraining,
  getTrainingScope,
  listEnrollableUsers,
  listTrainingAttendees,
} from "@/features/trainings/queries/trainings";
import { AttendeeList, EnrolForm } from "@/features/trainings/components/TrainingAttendees";
import { CancelTrainingButton } from "@/features/trainings/components/TrainingForms";
import { eatDay } from "@/features/meetings/format";

function dateRange(start: string, end: string) {
  const sw = (iso: string) => iso.split("-").reverse().join("/");
  return start === end ? sw(start) : `${sw(start)} – ${sw(end)}`;
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const T = t.trainings;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const training = await getTraining(await getTrainingScope(user), id);
  if (!training) notFound();

  const today = eatDay(new Date());
  const cancelled = training.status === "CANCELLED";
  const canManage =
    hasPermission(user.role, "TRAINING_MANAGE") &&
    !cancelled &&
    canManageBranch(await getManageBranchLimit(user), training.branchId);
  const canSeeAll = canManage || hasPermission(user.role, "TRAINING_VIEW_ALL");
  const canMark = canManage && training.startDate <= today;

  // Others only see their own enrolment record.
  const [attendees, people] = await Promise.all([
    listTrainingAttendees(id, canSeeAll ? undefined : user.userId),
    canManage ? listEnrollableUsers(training.branchId) : Promise.resolve([]),
  ]);
  const enrolled = new Set(attendees.map((a) => a.userId));
  const present = attendees.filter((a) => a.attendance === "PRESENT").length;
  const completed = attendees.filter((a) => a.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/trainings" className="text-xs text-slate-500 hover:underline">
            ← {T.back}
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {training.title} {cancelled && <Badge tone="rose">{T.cancelled}</Badge>}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {dateRange(training.startDate, training.endDate)} · {training.venue} ·{" "}
            {training.branchName ?? T.allBranches}
          </p>
        </div>
        {canManage && training.endDate >= today && <CancelTrainingButton id={training.id} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {canSeeAll && (
            <div className="grid grid-cols-3 gap-3">
              {[
                [T.enrolled, attendees.length],
                [T.attendance.PRESENT, present],
                [T.completed, completed],
              ].map(([label, n]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{n}</p>
                </div>
              ))}
            </div>
          )}
          {canManage && !canMark && <p className="text-xs text-slate-500">{T.markAfterStart}</p>}
          <AttendeeList
            trainingId={training.id}
            attendees={attendees}
            canManage={canManage}
            canMark={canMark}
            today={today}
            title={canSeeAll ? T.attendees : T.myRecord}
          />
        </div>

        <div className="space-y-6">
          <Card title={T.details}>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{T.trainer}</dt>
                <dd className="text-slate-800">{training.trainer}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{T.organiser}</dt>
                <dd className="text-slate-800">{training.organiserName ?? "—"}</dd>
              </div>
              {training.description && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{T.about}</dt>
                  <dd className="whitespace-pre-wrap text-slate-700">{training.description}</dd>
                </div>
              )}
            </dl>
          </Card>
          {canManage && (
            <EnrolForm
              trainingId={training.id}
              people={people.filter((p) => !enrolled.has(p.id)).map(({ id, fullName, role }) => ({ id, fullName, role }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
