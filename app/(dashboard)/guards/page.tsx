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
        You do not have permission to manage the guard registry.
      </div>
    );
  }

  const canPii = hasPermission(user.role, "PII_VIEW");
  const [guards, supervisors, regions, stations, clients, analytics] = await Promise.all([
    listGuards(canPii),
    getSupervisors(),
    listRegions(),
    listStations(),
    listClients(),
    getRegionSiteAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Guard Registry</h2>
        <p className="mt-1 text-sm text-slate-500">
          Register guards, manage profiles and supervisor assignments.
        </p>
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
