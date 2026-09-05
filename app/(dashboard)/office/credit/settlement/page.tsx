import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getOutstandingByGuard, listCredits } from "@/features/office/queries/credit";
import { SettleEntryForm, WriteOffForm, CREDIT_TYPE_LABELS } from "@/features/office";

export default async function CreditSettlementPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "CREDIT_SETTLE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        Only the bursar (or an admin) can run salary deductions.
      </div>
    );
  }

  const [byGuard, deducted] = await Promise.all([
    getOutstandingByGuard(),
    listCredits({ status: "DEDUCTED", limit: 50 }),
  ]);
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const grandTotal = byGuard.reduce((s, g) => s + g.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/office/credit" className="text-sm text-brand-600 hover:underline">
          ← Back to guard debts
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Month-End Salary Deductions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Outstanding debts per guard. &ldquo;Deduct all&rdquo; marks every outstanding entry of
          that guard as deducted for {defaultMonth}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Total to deduct this month
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {grandTotal.toLocaleString()} TZS
        </p>
      </div>

      {byGuard.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Nothing outstanding — all debts are settled. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {byGuard.map((guard) => (
            <div key={guard.guardId} className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{guard.guardName}</p>
                  <p className="text-xs text-slate-400">
                    {guard.employeeId} · {guard.entries.length} entr
                    {guard.entries.length === 1 ? "y" : "ies"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold text-amber-700">
                    {guard.totalAmount.toLocaleString()} TZS
                  </p>
                  <SettleEntryForm
                    creditIds={guard.entries.map((e) => e.id)}
                    defaultMonth={defaultMonth}
                    label="Deduct all"
                  />
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {guard.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 text-slate-500">{e.date}</td>
                      <td className="px-4 py-2">{CREDIT_TYPE_LABELS[e.type] ?? e.type}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-slate-600">
                        {e.description}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {e.amount.toLocaleString()} TZS
                      </td>
                      <td className="px-4 py-2 text-right">
                        <WriteOffForm creditId={e.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {deducted.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent deductions
          </h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {deducted.slice(0, 10).map((d) => (
              <li key={d.id} className="flex justify-between gap-4">
                <span>
                  {d.guardName} — {d.description} ({d.deductionMonth})
                </span>
                <span className="font-medium text-slate-800">
                  {d.amount.toLocaleString()} TZS
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
