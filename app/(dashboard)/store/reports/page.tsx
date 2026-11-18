import { t } from "@/lib/i18n";
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
        {t.store.deniedReports}
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
        <h2 className="text-2xl font-bold text-slate-900">{t.store.reportTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t.store.reportSubtitle}
        </p>
      </div>
      <StockReportView rows={rows} stations={stations} />
    </div>
  );
}
