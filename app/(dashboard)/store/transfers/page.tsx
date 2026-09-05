import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listStockTransfers, listItems, listStations } from "@/features/store/queries/stock";
import { StockTransferView } from "@/features/store";

export default async function StockTransfersPage() {
  const user = await getCurrentUser();
  const canRequest = hasPermission(user?.role, "STOCK_TRANSFER_INITIATE");
  const canApprove = hasPermission(user?.role, "STOCK_TRANSFER_APPROVE");

  if (!user || (!canRequest && !canApprove && !hasPermission(user?.role, "STOCK_VIEW"))) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view stock transfers.
      </div>
    );
  }

  const [transfers, items, stations] = await Promise.all([
    listStockTransfers(),
    listItems(),
    listStations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Stock Transfers</h2>
        <p className="mt-1 text-sm text-slate-500">
          Transfer stock between stations and regions. Approved transfers move the stock
          immediately.
        </p>
      </div>
      <StockTransferView
        transfers={transfers}
        items={items.map((i) => ({ id: i.id, name: i.name }))}
        stations={stations}
        canRequest={canRequest}
        canApprove={canApprove}
      />
    </div>
  );
}
