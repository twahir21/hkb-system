import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors } from "@/features/hr/queries/guards";
import {
  listBalances,
  listItems,
  listStations,
  listOpenIssues,
} from "@/features/store/queries/stock";
import { StockOps } from "@/features/store";

export default async function StorePage() {
  const user = await getCurrentUser();
  const canView = hasPermission(user?.role, "STOCK_VIEW");
  const canRecord = hasPermission(user?.role, "STOCK_RECORD");

  if (!user || !canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view the store.
      </div>
    );
  }

  const [balances, items, stations, openIssues] = await Promise.all([
    listBalances(),
    listItems(),
    listStations(),
    canRecord ? listOpenIssues() : Promise.resolve([]),
  ]);

  // Users list for the "received by" pickers.
  const supervisors = canRecord ? await getSupervisors() : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Store</h2>
          <p className="mt-1 text-sm text-slate-500">
            Current stock holdings per station and region.
          </p>
        </div>
        {canRecord && (
          <StockOps
            items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
            stations={stations}
            users={supervisors.map((s) => ({ id: s.id, fullName: s.fullName }))}
            openIssues={openIssues}
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">Region</th>
              <th className="px-4 py-3 font-semibold">Station</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Holding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {balances.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No stock recorded yet.
                </td>
              </tr>
            ) : (
              balances.map((b) => (
                <tr key={`${b.itemId}-${b.stationId}`} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{b.regionName}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.stationName}</td>
                  <td className="px-4 py-3">{b.itemName}</td>
                  <td className="px-4 py-3 font-semibold text-brand-700">
                    {b.quantity} {b.unit}
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
