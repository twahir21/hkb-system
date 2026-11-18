"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { regions, stations, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  regionBranchSchema,
  regionSchema,
  stationSchema,
  stationUpdateSchema,
} from "@/features/store/validators/store.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

export async function createRegion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STORE_LOCATIONS_MANAGE");

  const parsed = regionSchema.safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.get("description") || undefined,
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mkoa si sahihi" };
  }

  try {
    const [region] = await db.insert(regions).values(parsed.data).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_REGION_CREATE",
      entity: "regions",
      entityId: region.id,
      metadata: { name: parsed.data.name, branchId: parsed.data.branchId ?? null },
    });
  } catch {
    return { ok: false, error: "Mkoa wenye jina hili tayari upo." };
  }

  revalidatePath("/store/locations");
  revalidatePath("/store");
  return { ok: true, message: "Mkoa umeongezwa." };
}

/** Set (or clear) the branch a region belongs to. */
export async function setRegionBranch(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STORE_LOCATIONS_MANAGE");

  const parsed = regionBranchSchema.safeParse({
    id: formData.get("id") ?? undefined,
    branchId: formData.get("branchId") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Tawi la mkoa si sahihi" };
  }

  try {
    const [region] = await db
      .update(regions)
      .set({ branchId: parsed.data.branchId, updatedAt: new Date() })
      .where(eq(regions.id, parsed.data.id))
      .returning();
    if (!region) return { ok: false, error: "Mkoa haukupatikana." };

    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_REGION_UPDATE",
      entity: "regions",
      entityId: region.id,
      metadata: { name: region.name, branchId: parsed.data.branchId },
    });
  } catch {
    return { ok: false, error: "Imeshindikana kusasisha tawi la mkoa." };
  }

  revalidatePath("/store/locations");
  revalidatePath("/incidents");
  return { ok: true, message: "Imehifadhiwa." };
}

export async function createStation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STORE_LOCATIONS_MANAGE");

  const parsed = stationSchema.safeParse({
    name: formData.get("name") ?? undefined,
    regionId: formData.get("regionId") ?? undefined,
    supervisorId: formData.get("supervisorId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Kituo si sahihi" };
  }

  try {
    const [station] = await db.insert(stations).values(parsed.data).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_STATION_CREATE",
      entity: "stations",
      entityId: station.id,
      metadata: { name: parsed.data.name, regionId: parsed.data.regionId },
    });
  } catch {
    return { ok: false, error: "Kituo chenye jina hili tayari kipo kwenye mkoa huu." };
  }

  revalidatePath("/store/locations");
  revalidatePath("/store");
  return { ok: true, message: "Kituo kimeongezwa." };
}

export async function updateStation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STORE_LOCATIONS_MANAGE");

  const parsed = stationUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? undefined,
    regionId: formData.get("regionId") ?? undefined,
    supervisorId: formData.get("supervisorId") || undefined,
    inChargeId: formData.get("inChargeId") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Taarifa za kituo si sahihi",
    };
  }

  const inChargeId = parsed.data.inChargeId ?? null;
  if (inChargeId) {
    const person = await db.query.users.findFirst({
      where: eq(users.id, inChargeId),
      columns: { role: true },
    });
    if (person?.role !== "IN_CHARGE") {
      return { ok: false, error: "Mtu uliyemchagua si Mkuu wa Kituo." };
    }
  }

  try {

    const [station] = await db
      .update(stations)
      .set({
        name: parsed.data.name,
        regionId: parsed.data.regionId,
        supervisorId: parsed.data.supervisorId ?? null,
        inChargeId,
        updatedAt: new Date(),
      })
      .where(eq(stations.id, parsed.data.id))
      .returning();

    if (!station) {
      return { ok: false, error: "Kituo hakikupatikana." };
    }

    // An In-Charge leads one site: release them from any other site.
    if (inChargeId) {
      await db
        .update(stations)
        .set({ inChargeId: null, updatedAt: new Date() })
        .where(and(eq(stations.inChargeId, inChargeId), ne(stations.id, station.id)));
    }

    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_STATION_UPDATE",
      entity: "stations",
      entityId: station.id,
      metadata: {
        name: parsed.data.name,
        regionId: parsed.data.regionId,
        supervisorId: parsed.data.supervisorId ?? null,
        inChargeId,
      },
    });
  } catch {
    return {
      ok: false,
      error: "Kituo chenye jina hili tayari kipo kwenye mkoa huu.",
    };
  }

  revalidatePath("/store/locations");
  revalidatePath("/store");
  return { ok: true, message: "Kituo kimesasishwa." };
}

export async function deleteStation(
  stationId: string
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requirePermission("STORE_LOCATIONS_MANAGE");

  try {
    const [station] = await db
      .delete(stations)
      .where(eq(stations.id, stationId))
      .returning();

    if (!station) {
      return { ok: false, error: "Kituo hakikupatikana." };
    }

    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_STATION_DELETE",
      entity: "stations",
      entityId: station.id,
      metadata: { name: station.name },
    });

    revalidatePath("/store/locations");
    revalidatePath("/store");
    return { ok: true };
  } catch {
    return { ok: false, error: "Imeshindikana kufuta kituo." };
  }
}
