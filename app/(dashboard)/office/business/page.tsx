import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getMonthlySummaries } from "@/features/office/queries/business";
import { listGuardOptions } from "@/features/office/queries/credit";
import { RestockModal, SaleModal, ExpenseModal } from "@/features/office";

type PageProps = { searchParams: Promise<{ year?: string; month?: string }> };

export default async function OfficeBusinessPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "BUSINESS_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view office businesses.
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

  const [summaries, guards] = await Promise.all([
    getMonthlySummaries(year, month),
    listGuardOptions(),
  ]);
  const canManage = hasPermission(user?.role, "BUSINESS_MANAGE");

  const businessOpts = summaries.map((s) => ({
    id: s.businessId,
    name: s.name,
    unit: s.unit,
    sellPrice: 0,
    buyPrice: 0,
    stock: s.stock,
  }));

  const totalProfit = summaries.reduce((s, b) => s + b.profit, 0);
  const totalRevenue = summaries.reduce((s, b) => s + b.revenue, 0);
  const totalExpenses = summaries.reduce((s, b) => s + b.expenses, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Office Businesses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sales, expenses and profit for the office&apos;s fish &amp; maize flour businesses.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <RestockModal businesses={businessOpts} />
            <SaleModal businesses={businessOpts} guards={guards} />
            <ExpenseModal businesses={businessOpts} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-end gap-2" action="/office/business">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Month
            </span>
            <input
              type="month"
              name="month"
              defaultValue={`${year}-${String(month).padStart(2, "0")}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Apply
          </button>
        </form>
        <Link
          href="/office/business/history"
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          View sales &amp; expense history →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalRevenue.toLocaleString()} TZS
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expenses</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {totalExpenses.toLocaleString()} TZS
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net profit</p>
          <p
            className={`mt-1 text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
          >
            {totalProfit.toLocaleString()} TZS
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((b) => (
          <div key={b.businessId} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{b.name}</h3>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {b.stock} {b.unit} on hand
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">Units sold</dt>
              <dd className="text-right font-medium text-slate-900">
                {b.unitsSold} {b.unit}
              </dd>
              <dt className="text-slate-500">Revenue (cash)</dt>
              <dd className="text-right font-medium text-slate-900">
                {b.cashRevenue.toLocaleString()} TZS
              </dd>
              <dt className="text-slate-500">Revenue (credit to guards)</dt>
              <dd className="text-right font-medium text-amber-700">
                {b.creditRevenue.toLocaleString()} TZS
              </dd>
              <dt className="text-slate-500">Total revenue</dt>
              <dd className="text-right font-semibold text-slate-900">
                {b.revenue.toLocaleString()} TZS
              </dd>
              <dt className="text-slate-500">
                Expenses (incl. restock {b.restockSpend.toLocaleString()})
              </dt>
              <dd className="text-right font-medium text-rose-700">
                {b.expenses.toLocaleString()} TZS
              </dd>
              <dt className="mt-2 border-t border-slate-100 pt-2 font-semibold text-slate-700">
                Profit this month
              </dt>
              <dd
                className={`mt-2 border-t border-slate-100 pt-2 text-right text-lg font-bold ${b.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
              >
                {b.profit.toLocaleString()} TZS
              </dd>
            </dl>
          </div>
        ))}
        {summaries.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 lg:col-span-2">
            No businesses yet — run the seed script to create Fish and Maize Flour.
          </div>
        )}
      </div>
    </div>
  );
}

