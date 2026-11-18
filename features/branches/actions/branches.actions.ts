"use server";

import { revalidatePath } from "next/cache";
import { eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const branchSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters").max(150),
});

/** Add a remote branch (e.g. Tabora, Dodoma). SUPER_ADMIN only. */
export async function createBranch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("BRANCH_MANAGE");
  const parsed = branchSchema.safeParse({ name: formData.get("name") ?? undefined });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid branch" };
  }

  try {
    const [branch] = await db.insert(branches).values({ name: parsed.data.name }).returning();
    await writeAuditLog({
      actorId: actor.userId,
      action: "BRANCH_CREATE",
      entity: "branches",
      entityId: branch.id,
      metadata: { name: parsed.data.name },
    });
  } catch {
    return { ok: false, error: "A branch with this name already exists." };
  }

  revalidatePath("/branches");
  revalidatePath("/users");
  return { ok: true, message: "Branch created." };
}

/** Make one branch the HQ (only one HQ at a time). SUPER_ADMIN only. */
export async function setHqBranch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("BRANCH_MANAGE");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid branch." };

  await db.update(branches).set({ isHq: false, updatedAt: new Date() }).where(ne(branches.id, id.data));
  const [branch] = await db
    .update(branches)
    .set({ isHq: true, updatedAt: new Date() })
    .where(eq(branches.id, id.data))
    .returning();
  if (!branch) return { ok: false, error: "Branch no longer exists." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "BRANCH_SET_HQ",
    entity: "branches",
    entityId: branch.id,
    metadata: { name: branch.name },
  });

  revalidatePath("/branches");
  return { ok: true, message: `${branch.name} is now HQ.` };
}
