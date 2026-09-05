import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getStationReport, listStations } from "@/features/store/queries/stock";
import { StockReportView } from "@/features/store";

export default async function StockReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STOCK_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view stock reports.
      </div>
    );
  }

  const sp = await searchParams;
  const [rows, stations] = await Promise.all([
    getStationReport({
      stationId: sp.stationId || undefined,
      from: sp.from || undefined,
      to: sp.to || undefined,
    }),
    listStations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Stock Report</h2>
        <p className="mt-1 text-sm text-slate-500">
          Which station has how much stock, what was given to it, what was lost and what was
          returned.
        </p>
      </div>
      <StockReportView rows={rows} stations={stations} />
    </div>
  );
}
