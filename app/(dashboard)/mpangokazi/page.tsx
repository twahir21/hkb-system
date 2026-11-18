import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/rbac";
import { getUserBranch, listBranches } from "@/features/branches/queries/branches";
import {
  findOwnWorkPlan,
  getScopeGuards,
  getWorkPlan,
  getWorkPlanViewScope,
  listWorkPlans,
} from "@/features/mpangokazi/queries/mpangokazi";
import { WorkPlanForm } from "@/features/mpangokazi/components/WorkPlanForm";
import { ShareButtons } from "@/features/mpangokazi/components/ShareButtons";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function MpangokaziPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  const viewScope = user ? await getWorkPlanViewScope(user) : { kind: "none" as const };
  if (!user || viewScope.kind === "none") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        Huna ruhusa ya kuona Fomu ya Mpangokazi.
      </div>
    );
  }

  const sp = await searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });
  const date = sp.date && DATE_RE.test(sp.date) && sp.date <= today ? sp.date : today;
  const filterDate = sp.filterDate && DATE_RE.test(sp.filterDate) ? sp.filterDate : undefined;

  const canSubmit = hasPermission(user.role, "MPANGOKAZI_SUBMIT");
  const branchWide = hasPermission(user.role, "MPANGOKAZI_BRANCH_WIDE");

  let form: React.ReactNode = null;
  if (canSubmit) {
    const [ownBranch, branches] = await Promise.all([
      getUserBranch(user.userId),
      branchWide ? listBranches() : Promise.resolve([]),
    ]);
    const chosen =
      (branchWide && branches.find((b) => b.id === sp.branchId)) || ownBranch || branches[0] || null;
    const branchId = chosen?.id ?? null;

    const [guards, existingId] = await Promise.all([
      getScopeGuards({ userId: user.userId, branchWide, branchId, date }),
      findOwnWorkPlan(user.userId, date),
    ]);

    // Already sent today → start from what was sent, not from the Shift Sheet.
    let jobPosition = ROLE_LABELS[user.role];
    if (existingId) {
      const existing = await getWorkPlan({ kind: "own", userId: user.userId }, existingId);
      if (existing) {
        jobPosition = existing.jobPosition;
        const saved = new Map(existing.entries.map((e) => [e.guardId, e.status]));
        for (const g of guards) g.status = saved.get(g.guardId) ?? g.status;
      }
    }

    form = (
      <WorkPlanForm
        key={`${date}-${branchId}`}
        date={date}
        maxDate={today}
        branchName={chosen?.name ?? "—"}
        branchId={branchId}
        branches={branches}
        guards={guards}
        preparedByName={user.name}
        defaultJobPosition={jobPosition}
        existingId={existingId}
      />
    );
  }

  const history = await listWorkPlans(viewScope, { date: filterDate });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Fomu ya Mpangokazi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ripoti ya kila siku ya mkoa: walinzi waliopo, off, ruhusa, wagonjwa na wasiofika.
        </p>
      </div>

      {form}

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Fomu zilizotumwa</h3>
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="filterDate"
              defaultValue={filterDate ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
            <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
              Chuja
            </button>
            <Link href="/mpangokazi" className="text-xs text-slate-500 hover:underline">
              Ondoa
            </Link>
          </form>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">Tarehe</th>
                <th className="px-4 py-3">Mkoa</th>
                <th className="px-4 py-3">Msimamizi</th>
                <th className="px-4 py-3 text-center">Jumla</th>
                <th className="px-4 py-3 text-center">Waliopo</th>
                <th className="px-4 py-3 text-center">Off</th>
                <th className="px-4 py-3 text-center">Ruhusa</th>
                <th className="px-4 py-3 text-center">Wagonjwa</th>
                <th className="px-4 py-3 text-center">Hawapo</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{h.date}</td>
                  <td className="px-4 py-3 text-slate-600">{h.branchName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {h.preparedByName}
                    <p className="text-[11px] text-slate-400">{h.jobPosition}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{h.totalGuards}</td>
                  <td className="px-4 py-3 text-center text-emerald-700">{h.presentCount}</td>
                  <td className="px-4 py-3 text-center">{h.offCount}</td>
                  <td className="px-4 py-3 text-center text-amber-700">{h.permittedCount}</td>
                  <td className="px-4 py-3 text-center text-sky-700">{h.sickCount}</td>
                  <td className="px-4 py-3 text-center text-rose-700">{h.absentCount}</td>
                  <td className="px-4 py-3">
                    <ShareButtons id={h.id} fileLabel={`${h.branchName ?? "mkoa"}-${h.date}`} />
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    Hakuna fomu bado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
