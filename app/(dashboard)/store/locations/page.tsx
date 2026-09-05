import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors } from "@/features/hr/queries/guards";
import { listRegions, listStations } from "@/features/store/queries/stock";
import { RegionForm, StationForm } from "@/features/store";

export default async function StoreLocationsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STORE_LOCATIONS_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage store locations.
      </div>
    );
  }

  const [regions, stations, supervisors] = await Promise.all([
    listRegions(),
    listStations(),
    getSupervisors(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Regions &amp; Stations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Where stock is held — regions group stations.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <RegionForm />
          <StationForm
            regions={regions.map((r) => ({ id: r.id, name: r.name }))}
            supervisors={supervisors.map((s) => ({ id: s.id, fullName: s.fullName }))}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Station</th>
                <th className="px-4 py-3 font-semibold">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stations.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.regionName}</td>
                </tr>
              ))}
              {stations.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-slate-400">
                    No stations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
