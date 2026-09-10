import "server-only";

import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardProfiles, regions, stations } from "@/lib/db/schema";

export type SiteAnalytics = {
  stationId: string;
  stationName: string;
  guardCount: number;
};

export type RegionAnalytics = {
  regionId: string;
  regionName: string;
  siteCount: number;
  guardCount: number;
  sites: SiteAnalytics[];
};

/**
 * Sites-under-region analytics: total stations and posted guards per region,
 * with a per-site breakdown. Regions without sites are still listed.
 */
export async function getRegionSiteAnalytics(): Promise<{
  regions: RegionAnalytics[];
  unassignedGuards: number;
}> {
  const [allRegions, allStations, guardCounts, unassigned] = await Promise.all([
    db.select().from(regions).orderBy(asc(regions.name)),
    db
      .select({
        id: stations.id,
        regionId: stations.regionId,
        name: stations.name,
      })
      .from(stations)
      .orderBy(asc(stations.name)),
    db
      .select({
        stationId: guardProfiles.stationId,
        count: sql<number>`COUNT(*)`.as("guard_count"),
      })
      .from(guardProfiles)
      .where(sql`${guardProfiles.stationId} IS NOT NULL`)
      .groupBy(guardProfiles.stationId),
    db
      .select({ count: sql<number>`COUNT(*)`.as("unassigned") })
      .from(guardProfiles)
      .where(sql`${guardProfiles.stationId} IS NULL`),
  ]);

  const guardsByStation = new Map(
    guardCounts
      .filter((g): g is { stationId: string; count: number } => g.stationId !== null)
      .map((g) => [g.stationId, Number(g.count)]),
  );

  const result: RegionAnalytics[] = allRegions.map((r) => {
    const regionStations = allStations.filter((s) => s.regionId === r.id);
    const sites: SiteAnalytics[] = regionStations.map((s) => ({
      stationId: s.id,
      stationName: s.name,
      guardCount: guardsByStation.get(s.id) ?? 0,
    }));
    return {
      regionId: r.id,
      regionName: r.name,
      siteCount: sites.length,
      guardCount: sites.reduce((sum, s) => sum + s.guardCount, 0),
      sites,
    };
  });

  return {
    regions: result,
    unassignedGuards: Number(unassigned[0]?.count ?? 0),
  };
}
