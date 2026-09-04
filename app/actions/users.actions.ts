"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, roleEnum, type Role } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";

export type UserActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  userId?: string;
};

const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, hyphens and underscores"),
  role: z.enum(roleEnum.enumValues),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const userUpdateSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
  fullName: z.string().trim().min(2).max(255),
  role: z.enum(roleEnum.enumValues),
  password: z.string().min(6).optional().or(z.literal("")),
});

/** Create a new system user / staff account (SUPER_ADMIN only) */
export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  const parsed = userCreateSchema.safeParse({
    fullName: formData.get("fullName") ?? undefined,
    email: (formData.get("email") as string)?.toLowerCase().trim() ?? undefined,
    username: formData.get("username") ?? undefined,
    role: formData.get("role") ?? undefined,
    password: formData.get("password") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid user data" };
  }

  const v = parsed.data;

  // Check if username or email is already taken
  const existing = await db.query.users.findFirst({
    where: or(
      eq(sql`lower(${users.email})`, v.email),
      eq(sql`lower(${users.username})`, v.username.toLowerCase())
    ),
  });

  if (existing) {
    if (existing.email.toLowerCase() === v.email) {
      return { ok: false, error: "A user with this email address already exists." };
    }
    return { ok: false, error: "This username is already taken. Please choose another." };
  }

  const passwordHash = await bcrypt.hash(v.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      email: v.email,
      username: v.username,
      fullName: v.fullName,
      role: v.role,
      passwordHash,
    })
    .returning({ id: users.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "USER_CREATE",
    entity: "users",
    entityId: created.id,
    metadata: { email: v.email, username: v.username, role: v.role },
  });

  revalidatePath("/users");
  revalidatePath("/guards");
  revalidatePath("/dashboard");
  return { ok: true, userId: created.id, message: `User ${v.fullName} registered successfully.` };
}

/** Update an existing user's details / role / password */
export async function updateUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  const parsed = userUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    fullName: formData.get("fullName") ?? undefined,
    role: formData.get("role") ?? undefined,
    password: formData.get("password") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const v = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.id, v.id),
  });

  if (!existing) {
    return { ok: false, error: "User not found." };
  }

  const updateData: {
    fullName: string;
    role: Role;
    passwordHash?: string;
    updatedAt: Date;
  } = {
    fullName: v.fullName,
    role: v.role,
    updatedAt: new Date(),
  };

  if (v.password && v.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(v.password, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, v.id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "USER_UPDATE",
    entity: "users",
    entityId: v.id,
    metadata: { role: v.role, passwordChanged: Boolean(v.password) },
  });

  revalidatePath("/users");
  return { ok: true, userId: v.id, message: "User updated successfully." };
}

/** Delete a user from the system */
export async function deleteUser(userId: string): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  if (actor.userId === userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) {
    return { ok: false, error: "User not found." };
  }

  await db.delete(users).where(eq(users.id, userId));

  await writeAuditLog({
    actorId: actor.userId,
    action: "USER_DELETE",
    entity: "users",
    entityId: userId,
    metadata: { email: existing.email, username: existing.username, role: existing.role },
  });

  revalidatePath("/users");
  revalidatePath("/guards");
  return { ok: true, message: "User deleted successfully." };
}
