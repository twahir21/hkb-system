import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listBusinesses, listSales } from "@/features/office/queries/business";

type PageProps = { searchParams: Promise<{ year?: string; month?: string }> };

const SALE_TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  CREDIT_GUARD: "Credit (guard)",
};

export default async function BusinessHistoryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "BUSINESS_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view business history.
      </div>
    );
  }

  const sp = await searchParams;
  const now = new Date();
  let year = sp.year ? Number(sp.year) : now.getFullYear();
  let month = now.getMonth() + 1;

  if (sp.month) {
    if (sp.month.includes("-")) {
      const [y, m] = sp.month.split("-");
      year = Number(y) || year;
      month = Number(m) || month;
    } else {
      month = Number(sp.month) || month;
    }
  }

  const [businesses, sales] = await Promise.all([
    listBusinesses(),
    listSales({ year, month, limit: 200 }),
  ]);
  const salesTotal = sales.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Business History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sales for {year}-{String(month).padStart(2, "0")} — total {salesTotal.toLocaleString()}{" "}
            TZS across {sales.length} entries.
          </p>
        </div>
        <form className="flex items-end gap-2" action="/office/business/history">
          <input
            type="month"
            name="month"
            defaultValue={`${year}-${String(month).padStart(2, "0")}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-4 py-2 font-semibold">Business</th>
              <th className="px-4 py-2 font-semibold">Qty</th>
              <th className="px-4 py-2 font-semibold">Unit price</th>
              <th className="px-4 py-2 font-semibold">Total</th>
              <th className="px-4 py-2 font-semibold">Type</th>
              <th className="px-4 py-2 font-semibold">Guard</th>
              <th className="px-4 py-2 font-semibold">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No sales this month.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{s.date}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{s.businessName}</td>
                  <td className="px-4 py-2">{s.quantity}</td>
                  <td className="px-4 py-2">{s.unitPrice.toLocaleString()}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">
                    {s.totalAmount.toLocaleString()} TZS
                  </td>
                  <td className="px-4 py-2">{SALE_TYPE_LABELS[s.saleType] ?? s.saleType}</td>
                  <td className="px-4 py-2 text-slate-600">{s.guardName ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{s.recordedByName ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Businesses: {businesses.map((b) => b.name).join(", ") || "none yet"}.
      </p>
    </div>
  );
}

