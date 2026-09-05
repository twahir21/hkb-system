"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { regions, stations } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { regionSchema, stationSchema } from "@/features/store/validators/store.schema";
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
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid region" };
  }

  try {
    const [region] = await db.insert(regions).values(parsed.data).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_REGION_CREATE",
      entity: "regions",
      entityId: region.id,
      metadata: { name: parsed.data.name },
    });
  } catch {
    return { ok: false, error: "A region with this name already exists." };
  }

  revalidatePath("/store/locations");
  revalidatePath("/store");
  return { ok: true, message: "Region created." };
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid station" };
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
    return { ok: false, error: "A station with this name already exists in the region." };
  }

  revalidatePath("/store/locations");
  revalidatePath("/store");
  return { ok: true, message: "Station created." };
}
