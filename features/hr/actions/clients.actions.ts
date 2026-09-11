"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { clientSchema, clientUpdateSchema } from "@/features/hr/validators/client.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** Create a client (company) guards can be posted under (SUPER_ADMIN / HR). */
export async function createClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("GUARD_MANAGE");

  const parsed = clientSchema.safeParse({
    name: formData.get("name") ?? undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid client" };
  }

  try {
    const [client] = await db.insert(clients).values(parsed.data).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "CLIENT_CREATE",
      entity: "clients",
      entityId: client.id,
      metadata: { name: parsed.data.name },
    });
  } catch {
    return { ok: false, error: "A client with this name already exists." };
  }

  revalidatePath("/clients");
  revalidatePath("/guards");
  return { ok: true, message: "Client created." };
}

/** Update a client's name / description / active state (SUPER_ADMIN / HR). */
export async function updateClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("GUARD_MANAGE");

  const parsed = clientUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    name: formData.get("name") ?? undefined,
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid client update" };
  }
  const { id, ...values } = parsed.data;

  try {
    const [client] = await db
      .update(clients)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (!client) {
      return { ok: false, error: "Client no longer exists." };
    }
    await writeAuditLog({
      actorId: actor.userId,
      action: "CLIENT_UPDATE",
      entity: "clients",
      entityId: id,
      metadata: { fields: Object.keys(values) as string[] },
    });
  } catch {
    return { ok: false, error: "A client with this name already exists." };
  }

  revalidatePath("/clients");
  revalidatePath("/guards");
  return { ok: true, message: "Client updated." };
}
