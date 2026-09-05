"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storeItems } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { itemSchema, itemUpdateSchema } from "@/features/store/validators/store.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

export async function createItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STORE_MANAGE_ITEMS");

  const parsed = itemSchema.safeParse({
    name: formData.get("name") ?? undefined,
    unit: formData.get("unit") ?? undefined,
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };
  }

  try {
    const [item] = await db.insert(storeItems).values(parsed.data).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "STORE_ITEM_CREATE",
      entity: "store_items",
      entityId: item.id,
      metadata: { name: parsed.data.name },
    });
  } catch {
    return { ok: false, error: "An item with this name already exists." };
  }

  revalidatePath("/store/items");
  revalidatePath("/store");
  return { ok: true, message: "Item created." };
}

export async function updateItem(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermission("STORE_MANAGE_ITEMS");

  const parsed = itemUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? undefined,
    unit: formData.get("unit") ?? undefined,
    category: formData.get("category") || undefined,
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };
  }
  const { id, ...values } = parsed.data;

  await db
    .update(storeItems)
    .set({ ...values, category: values.category ?? null, updatedAt: new Date() })
    .where(eq(storeItems.id, id));

  revalidatePath("/store/items");
  revalidatePath("/store");
  return { ok: true, message: "Item updated." };
}
