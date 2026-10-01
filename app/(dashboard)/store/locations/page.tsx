import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors } from "@/features/hr/queries/guards";
import { listRegions, listStations } from "@/features/store/queries/stock";
import { RegionForm, StationForm, StationManager } from "@/features/store";
import { getRegionSiteAnalytics } from "@/features/hr/queries/locations";
import { RegionAnalyticsCard } from "@/features/hr/components/RegionAnalyticsCard";

export default async function StoreLocationsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STORE_LOCATIONS_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage store locations.
      </div>
    );
  }

  const [regions, stations, supervisors, analytics] = await Promise.all([
    listRegions(),
    listStations(),
    getSupervisors(),
    getRegionSiteAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Regions &amp; Stations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Where stock is held and guards are posted — manage stations and assign supervisors.
        </p>
      </div>
      <RegionAnalyticsCard
        regions={analytics.regions}
        unassignedGuards={analytics.unassignedGuards}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <RegionForm />
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
          />
        </div>
      </div>
    </div>
  );
}
