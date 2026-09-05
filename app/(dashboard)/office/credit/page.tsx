import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import {
  listCredits,
  listGuardOptions,
  listDeductionMonths,
} from "@/features/office/queries/credit";
import {
  RecordCreditModal,
  SettleEntryForm,
  WriteOffForm,
  CREDIT_TYPE_LABELS,
} from "@/features/office";

const statusTone: Record<string, string> = {
  OUTSTANDING: "bg-amber-100 text-amber-800",
  DEDUCTED: "bg-emerald-100 text-emerald-800",
  WRITTEN_OFF: "bg-slate-200 text-slate-600",
};

export default async function OfficeCreditPage() {
  const user = await getCurrentUser();
  const canView =
    hasPermission(user?.role, "CREDIT_RECORD") || hasPermission(user?.role, "BUSINESS_VIEW");

  if (!user || !canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view guard debts.
      </div>
    );
  }

  const canSettle = hasPermission(user?.role, "CREDIT_SETTLE");
  const canRecord = hasPermission(user?.role, "CREDIT_RECORD");
  const [credits, guards, deductionMonths] = await Promise.all([
    listCredits({ limit: 200 }),
    listGuardOptions(),
    listDeductionMonths(),
  ]);

  const outstanding = credits.filter((c) => c.status === "OUTSTANDING");
  const outstandingTotal = outstanding.reduce((s, c) => s + c.amount, 0);
  const defaultMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Guard Debts (Credit)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fish, maize flour and medical treatments given on credit — deducted from salary
            at month end by the bursar.
          </p>
        </div>
        {canRecord && <RecordCreditModal guards={guards} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Outstanding total
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {outstandingTotal.toLocaleString()} TZS
          </p>
          <p className="text-xs text-slate-400">{outstanding.length} unpaid entries</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Guards owing
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {guards.filter((g) => g.outstandingAmount > 0).length}
          </p>
          <p className="text-xs text-slate-400">of {guards.length} guards registered</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last deduction month
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {deductionMonths[0]?.deductionMonth ?? "—"}
          </p>
          <p className="text-xs text-slate-400">
            {deductionMonths[0]
              ? `${deductionMonths[0].totalAmount.toLocaleString()} TZS across ${deductionMonths[0].guards} guards`
              : "No deductions recorded yet"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Guard</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Recorded by</th>
              {canSettle && <th className="px-4 py-3 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credits.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No debts recorded yet.
                </td>
              </tr>
            ) : (
              credits.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{c.date}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{c.guardName}</p>
                    <p className="text-xs text-slate-400">{c.employeeId}</p>
                  </td>
                  <td className="px-4 py-3">{CREDIT_TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                    {c.description}
                    {c.quantity !== null ? ` (${c.quantity})` : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {c.amount.toLocaleString()} TZS
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[c.status] ?? ""}`}
                    >
                      {c.status}
                    </span>
                    {c.deductionMonth && (
                      <p className="text-xs text-slate-400">{c.deductionMonth}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.recordedByName ?? "—"}</td>
                  {canSettle && (
                    <td className="px-4 py-3">
                      {c.status === "OUTSTANDING" ? (
                        <div className="flex gap-2">
                          <SettleEntryForm
                            creditIds={[c.id]}
                            defaultMonth={defaultMonth}
                            label="Deduct"
                          />
                          <WriteOffForm creditId={c.id} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

