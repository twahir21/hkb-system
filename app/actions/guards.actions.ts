"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardProfiles, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { guardSchema } from "@/lib/validators/schemas";
import type { ActionState } from "./attendance.actions";

export type GuardState = ActionState & { guardId?: string };

/** Create a guard: links/stamps the user row and inserts their profile (PII). */
export async function createGuard(_prev: GuardState, formData: FormData): Promise<GuardState> {
  const actor = await requirePermission("GUARD_MANAGE");

  const parsed = guardSchema.safeParse({
    email: formData.get("email") ?? undefined,
    fullName: formData.get("fullName") ?? undefined,
    employeeId: formData.get("employeeId") ?? undefined,
    age: formData.get("age") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    homeLocation: formData.get("homeLocation") ?? undefined,
    workLocation: formData.get("workLocation") ?? undefined,
    kinName: formData.get("kinName") ?? undefined,
    kinRelation: formData.get("kinRelation") ?? undefined,
    kinPhone: formData.get("kinPhone") ?? undefined,
    registrationDate: formData.get("registrationDate") ?? undefined,
    assignedSupervisorId: formData.get("assignedSupervisorId") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid guard data" };
  }
  const v = parsed.data;

  let userId: string;
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, v.email),
  });
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({ googleId: "", email: v.email, fullName: v.fullName, role: "GUARD" })
      .returning({ id: users.id });
    userId = created.id;
  }

  const [profile] = await db
    .insert(guardProfiles)
    .values({
      userId,
      employeeId: v.employeeId,
      age: v.age,
      phone: v.phone,
      homeLocation: v.homeLocation,
      workLocation: v.workLocation,
      kinName: v.kinName,
      kinRelation: v.kinRelation,
      kinPhone: v.kinPhone,
      registrationDate: v.registrationDate,
      assignedSupervisorId: v.assignedSupervisorId ?? null,
    })
    .returning({ id: guardProfiles.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "GUARD_CREATE",
    entity: "guard_profiles",
    entityId: profile.id,
    metadata: { employeeId: v.employeeId, email: v.email },
  });

  revalidatePath("/guards");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true, guardId: profile.id, message: "Guard registered." };
}

/** Update a guard profile (PII + supervisor assignment). */
export async function updateGuard(_prev: GuardState, formData: FormData): Promise<GuardState> {
  const actor = await requirePermission("GUARD_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Missing guard id" };

  const parsed = guardSchema.partial().safeParse({
    fullName: formData.get("fullName") || undefined,
    age: formData.get("age") ?? undefined,
    phone: formData.get("phone") || undefined,
    homeLocation: formData.get("homeLocation") || undefined,
    workLocation: formData.get("workLocation") || undefined,
    kinName: formData.get("kinName") || undefined,
    kinRelation: formData.get("kinRelation") || undefined,
    kinPhone: formData.get("kinPhone") || undefined,
    assignedSupervisorId: formData.get("assignedSupervisorId") || null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update" };
  }
  const v = parsed.data;

  await db
    .update(guardProfiles)
    .set({
      age: v.age,
      phone: v.phone,
      homeLocation: v.homeLocation,
      workLocation: v.workLocation,
      kinName: v.kinName,
      kinRelation: v.kinRelation,
      kinPhone: v.kinPhone,
      assignedSupervisorId:
        v.assignedSupervisorId === null || v.assignedSupervisorId === undefined
          ? undefined
          : v.assignedSupervisorId,
      updatedAt: new Date(),
    })
    .where(eq(guardProfiles.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "GUARD_UPDATE",
    entity: "guard_profiles",
    entityId: id,
    metadata: { fields: Object.keys(v) as string[] },
  });

  revalidatePath("/guards");
  revalidatePath("/attendance");
  return { ok: true, guardId: id, message: "Guard updated." };
}