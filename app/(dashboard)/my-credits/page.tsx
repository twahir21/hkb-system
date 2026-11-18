import { getCurrentUser } from "@/lib/auth/dal";
import { getGuardByUserId } from "@/features/hr/queries/guards";
import { listCredits, getGuardTotalOutstanding } from "@/features/office/queries/credit";
import { CREDIT_TYPE_LABELS } from "@/features/office";
import { hasPermission } from "@/lib/auth/rbac";
import { enumLabel, t } from "@/lib/i18n";

/** Guard-facing view of their own office debts (fish, flour, medical). */
export default async function MyCreditsPage() {
  const user = await getCurrentUser();

  if (!user || !hasPermission(user.role, "CREDIT_VIEW_OWN")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.common.guardOnly}
      </div>
    );
  }

  const profile = await getGuardByUserId(user.userId);
  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        {t.common.noProfile}
      </div>
    );
  }

  const [credits, outstanding] = await Promise.all([
    listCredits({ guardId: profile.id, limit: 100 }),
    getGuardTotalOutstanding(profile.id),
  ]);

  const statusTone: Record<string, string> = {
    OUTSTANDING: "bg-amber-100 text-amber-800",
    DEDUCTED: "bg-emerald-100 text-emerald-800",
    WRITTEN_OFF: "bg-slate-200 text-slate-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.myCredits.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t.myCredits.subtitle}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.myCredits.owed}
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-700">
          {outstanding.toLocaleString()} TZS
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">{t.common.date}</th>
              <th className="px-4 py-3 font-semibold">{t.common.type}</th>
              <th className="px-4 py-3 font-semibold">{t.common.description}</th>
              <th className="px-4 py-3 font-semibold">{t.common.amount}</th>
              <th className="px-4 py-3 font-semibold">{t.common.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {t.myCredits.empty}
                </td>
              </tr>
            ) : (
              credits.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{c.date}</td>
                  <td className="px-4 py-3">{CREDIT_TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{c.description}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {c.amount.toLocaleString()} TZS
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[c.status] ?? ""}`}
                    >
                      {c.status === "DEDUCTED" && c.deductionMonth
                        ? `${t.myCredits.deducted} (${c.deductionMonth})`
                        : enumLabel(c.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
