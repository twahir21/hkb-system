"use client";

import type { RegionAnalytics } from "@/features/hr/queries/locations";

/** Sites & guards per region — data-consistency snapshot for HR. */
export function RegionAnalyticsCard({
  regions,
  unassignedGuards,
}: {
  regions: RegionAnalytics[];
  unassignedGuards: number;
}) {
  const totalSites = regions.reduce((s, r) => s + r.siteCount, 0);
  const totalGuards = regions.reduce((s, r) => s + r.guardCount, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="font-semibold text-slate-900">Sites by Region</h3>
          <p className="text-xs text-slate-500">
            Total work sites (stations) and posted guards per region.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-brand-50 px-3 py-1.5 font-semibold text-brand-700">
            {totalSites} sites
          </span>
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
            {totalGuards} guards posted
          </span>
          {unassignedGuards > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
              {unassignedGuards} unassigned
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <div key={r.regionId} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between">
              <h4 className="font-semibold text-slate-800">{r.regionName}</h4>
              <span className="text-xs text-slate-500">
                {r.siteCount} site{r.siteCount === 1 ? "" : "s"} · {r.guardCount} guard
                {r.guardCount === 1 ? "" : "s"}
              </span>
            </div>
            {r.sites.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {r.sites.map((s) => (
                  <li key={s.stationId} className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.stationName}</span>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-medium">
                      {s.guardCount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No sites registered yet.</p>
            )}
          </div>
        ))}
        {regions.length === 0 && (
          <p className="text-sm text-slate-400">
            No regions yet — add regions and sites under Store → Regions &amp; Stations.
          </p>
        )}
      </div>
    </div>
  );
}
