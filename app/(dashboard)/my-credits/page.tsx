import { getCurrentUser } from "@/lib/auth/dal";
import { getGuardByUserId } from "@/features/hr/queries/guards";
import { listCredits, getGuardTotalOutstanding } from "@/features/office/queries/credit";
import { CREDIT_TYPE_LABELS } from "@/features/office";

/** Guard-facing view of their own office debts (fish, flour, medical). */
export default async function MyCreditsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "GUARD") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        This page is only available to guard accounts.
      </div>
    );
  }

  const profile = await getGuardByUserId(user.userId);
  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        No guard profile is linked to your account yet. Please contact your administrator.
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
        <h2 className="text-2xl font-bold text-slate-900">My Office Debts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Items taken on credit from the office (fish, maize flour) and medical treatments.
          Outstanding amounts are deducted from your salary at month end.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Currently owed
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-700">
          {outstanding.toLocaleString()} TZS
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credits.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  You have no office debts. 🎉
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
                        ? `Deducted (${c.deductionMonth})`
                        : c.status}
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
