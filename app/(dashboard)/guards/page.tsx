import { t } from "@/lib/i18n";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listGuards, getSupervisors } from "@/features/hr/queries/guards";
import { getRegionSiteAnalytics } from "@/features/hr/queries/locations";
import { listClients } from "@/features/hr/queries/clients";
import { listRegions, listStations } from "@/features/store/queries/stock";
import { GuardManager } from "@/features/hr/components/GuardManager";
import { RegionAnalyticsCard } from "@/features/hr/components/RegionAnalyticsCard";

export default async function GuardsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "GUARD_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.denied.guards}
      </div>
    );
  }

  const canPii = hasPermission(user.role, "PII_VIEW");
  // Registry lists disabled guards too (so they can be re-activated); every
  // other screen in the system only ever sees active guards.
  const [guards, supervisors, regions, stations, clients, analytics] = await Promise.all([
    listGuards(canPii, { includeDisabled: true }),
    getSupervisors(),
    listRegions(),
    listStations(),
    listClients(),
    getRegionSiteAnalytics(),
  ]);
  const canExportPayroll = hasPermission(user.role, "PAYROLL_EXPORT");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.guardsPage.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t.guardsPage.subtitle}
          </p>
        </div>
        {canExportPayroll && (
          <a href="/reports?tab=guards-pdf">
            <Button variant="secondary">
              <FileDown className="h-4 w-4 text-brand-600" /> {t.guardsPage.exportPayroll}
            </Button>
          </a>
        )}
      </div>
      <RegionAnalyticsCard
        regions={analytics.regions}
        unassignedGuards={analytics.unassignedGuards}
      />
      <GuardManager
        guards={guards}
        supervisors={supervisors.map((s) => ({
          id: s.id,
          name: s.fullName,
          role: s.role,
        }))}
        regions={regions.map((r) => ({ id: r.id, name: r.name }))}
        stations={stations.map((s) => ({ id: s.id, name: s.name, regionId: s.regionId }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive }))}
      />
    </div>
  );
}
