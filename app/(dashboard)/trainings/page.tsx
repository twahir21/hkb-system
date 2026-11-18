import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { canManageBranch, getManageBranchLimit } from "@/lib/auth/branch-limit";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { listBranches } from "@/features/branches/queries/branches";
import { getTrainingScope, listTrainings } from "@/features/trainings/queries/trainings";
import { CancelTrainingButton, TrainingForm } from "@/features/trainings/components/TrainingForms";
import { eatDay } from "@/features/meetings/format";

function dateRange(start: string, end: string) {
  const sw = (iso: string) => iso.split("-").reverse().join("/");
  return start === end ? sw(start) : `${sw(start)} – ${sw(end)}`;
}

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const T = t.trainings;

  const sp = await searchParams;
  const past = sp.when === "past";
  const today = eatDay(new Date());
  // Office Assistant: organises its own branch's trainings only.
  const limit = await getManageBranchLimit(user);
  const canManage = hasPermission(user.role, "TRAINING_MANAGE") && limit !== "none";
  const ownBranch = limit !== null && limit !== "none" ? limit : undefined;

  const [rows, branches] = await Promise.all([
    getTrainingScope(user).then((scope) => listTrainings(scope, past ? "past" : "upcoming", today)),
    canManage ? listBranches().then((bs) => (ownBranch ? bs.filter((b) => b.id === ownBranch) : bs)) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{T.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{T.subtitle}</p>
      </div>

      <div className={cn("grid gap-6", canManage && "xl:grid-cols-5")}>
        {canManage && (
          <div className="xl:col-span-2">
            <TrainingForm branches={branches} today={today} fixedBranchId={ownBranch} />
          </div>
        )}

        <div className={cn("space-y-3", canManage && "xl:col-span-3")}>
          <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <Link href="/trainings" className={cn("rounded-lg px-3 py-1.5", !past ? "bg-white shadow-sm" : "text-slate-500")}>
              {T.upcoming}
            </Link>
            <Link
              href="/trainings?when=past"
              className={cn("rounded-lg px-3 py-1.5", past ? "bg-white shadow-sm" : "text-slate-500")}
            >
              {T.past}
            </Link>
          </div>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.map((r) => {
              const cancelled = r.status === "CANCELLED";
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-4 px-4 py-3">
                  <div className="w-40 shrink-0 text-sm">
                    <p className="font-semibold text-slate-800">{dateRange(r.startDate, r.endDate)}</p>
                    <p className="text-xs text-slate-500">{r.branchName ?? T.allBranches}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium text-slate-900", cancelled && "text-slate-400 line-through")}>
                      <Link href={`/trainings/${r.id}`} className="hover:underline">
                        {r.title}
                      </Link>{" "}
                      {cancelled && <Badge tone="rose">{T.cancelled}</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {T.trainer}: {r.trainer} · {r.venue} · {r.attendeeCount} {T.participants}
                    </p>
                    {r.description && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{r.description}</p>}
                    {r.organiserName && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {T.organiser}: {r.organiserName}
                      </p>
                    )}
                  </div>
                  {canManage && !past && !cancelled && canManageBranch(limit, r.branchId) && <CancelTrainingButton id={r.id} />}
                </li>
              );
            })}
            {rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">{T.none}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
