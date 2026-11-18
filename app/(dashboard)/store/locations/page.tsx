import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors } from "@/features/hr/queries/guards";
import { listInChargeUsers, listRegions, listStations } from "@/features/store/queries/stock";
import { RegionBranchList, RegionForm, StationForm, StationManager } from "@/features/store";
import { listBranches } from "@/features/branches/queries/branches";
import { getRegionSiteAnalytics } from "@/features/hr/queries/locations";
import { RegionAnalyticsCard } from "@/features/hr/components/RegionAnalyticsCard";

export default async function StoreLocationsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STORE_LOCATIONS_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.store.deniedLocations}
      </div>
    );
  }

  const [regions, stations, supervisors, analytics, inCharges, branches] = await Promise.all([
    listRegions(),
    listStations(),
    getSupervisors(),
    getRegionSiteAnalytics(),
    listInChargeUsers(),
    listBranches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.store.locationsTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t.store.locationsSubtitle}
        </p>
      </div>
      <RegionAnalyticsCard
        regions={analytics.regions}
        unassignedGuards={analytics.unassignedGuards}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <RegionForm branches={branches} />
          <RegionBranchList
            regions={regions.map((r) => ({ id: r.id, name: r.name, branchId: r.branchId }))}
            branches={branches}
          />
          <StationForm
            regions={regions.map((r) => ({ id: r.id, name: r.name }))}
            supervisors={supervisors.map((s) => ({ id: s.id, fullName: s.fullName }))}
          />
        </div>
        <div className="lg:col-span-2">
          <StationManager
            stations={stations}
            regions={regions.map((r) => ({ id: r.id, name: r.name }))}
            supervisors={supervisors.map((s) => ({
              id: s.id,
              fullName: s.fullName,
              role: s.role,
            }))}
            inCharges={inCharges}
          />
        </div>
      </div>
    </div>
  );
}
