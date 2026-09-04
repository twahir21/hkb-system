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

export type BulkImportRowError = {
  row: number;
  identifier: string;
  reason: string;
};

export type BulkImportResult = {
  ok: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: BulkImportRowError[];
  message?: string;
  error?: string;
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    values.push(cur.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawValues = parseLine(lines[i]);
    if (rawValues.every((v) => v === "")) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rawValues[idx] ?? "";
    });
    rows.push(rowObj);
  }

  return rows;
}

/** Bulk register users from a CSV file */
export async function bulkImportUsers(formData: FormData): Promise<BulkImportResult> {
  const actor = await requirePermission("USER_MANAGE");

  const file = formData.get("file") as File | null;
  if (!file) {
    return { ok: false, total: 0, imported: 0, failed: 0, errors: [], error: "No CSV file provided." };
  }

  const csvContent = await file.text();
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    return {
      ok: false,
      total: 0,
      imported: 0,
      failed: 0,
      errors: [],
      error: "The uploaded CSV file is empty or does not contain valid data rows.",
    };
  }

  // Fetch all existing emails and usernames for fast collision check
  const allExistingUsers = await db
    .select({ email: users.email, username: users.username })
    .from(users);

  const existingEmails = new Set(allExistingUsers.map((u) => u.email.toLowerCase()));
  const existingUsernames = new Set(
    allExistingUsers.map((u) => (u.username ? u.username.toLowerCase() : "")).filter(Boolean)
  );

  const seenInBatchEmails = new Set<string>();
  const seenInBatchUsernames = new Set<string>();

  const validEntries: {
    fullName: string;
    email: string;
    username: string;
    role: Role;
    passwordHash: string;
  }[] = [];

  const errors: BulkImportRowError[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNum = idx + 2; // account for 1-based index & header row
    const row = rows[idx];

    const fullName = (row.fullname || row.name || "").trim();
    const email = (row.email || "").toLowerCase().trim();
    const username = (row.username || "").trim();
    const roleRaw = (row.role || "").toUpperCase().trim();
    const password = (row.password || "").trim();

    const identifier = email || username || fullName || `Row #${rowNum}`;

    if (!fullName || fullName.length < 2) {
      errors.push({ row: rowNum, identifier, reason: "Full name is missing or less than 2 characters" });
      continue;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, identifier, reason: `Invalid email address: '${email}'` });
      continue;
    }

    if (!username || username.length < 3) {
      errors.push({ row: rowNum, identifier, reason: "Username must be at least 3 characters" });
      continue;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errors.push({
        row: rowNum,
        identifier,
        reason: "Username contains invalid characters (letters, numbers, dots, dashes, underscores only)",
      });
      continue;
    }

    const validRoles = roleEnum.enumValues as readonly string[];
    if (!validRoles.includes(roleRaw)) {
      errors.push({
        row: rowNum,
        identifier,
        reason: `Invalid role '${roleRaw}'. Must be one of: ${validRoles.join(", ")}`,
      });
      continue;
    }

    if (!password || password.length < 6) {
      errors.push({ row: rowNum, identifier, reason: "Password must be at least 6 characters" });
      continue;
    }

    // Check collisions with DB
    if (existingEmails.has(email)) {
      errors.push({ row: rowNum, identifier, reason: `Email '${email}' is already registered in the system` });
      continue;
    }

    if (existingUsernames.has(username.toLowerCase())) {
      errors.push({
        row: rowNum,
        identifier,
        reason: `Username '${username}' is already taken by another account`,
      });
      continue;
    }

    // Check collisions inside the CSV batch itself
    if (seenInBatchEmails.has(email)) {
      errors.push({ row: rowNum, identifier, reason: `Duplicate email '${email}' found in the same CSV` });
      continue;
    }

    if (seenInBatchUsernames.has(username.toLowerCase())) {
      errors.push({ row: rowNum, identifier, reason: `Duplicate username '${username}' found in the same CSV` });
      continue;
    }

    seenInBatchEmails.add(email);
    seenInBatchUsernames.add(username.toLowerCase());

    const passwordHash = await bcrypt.hash(password, 10);

    validEntries.push({
      fullName,
      email,
      username,
      role: roleRaw as Role,
      passwordHash,
    });
  }

  // Insert valid users
  if (validEntries.length > 0) {
    await db.insert(users).values(validEntries);

    await writeAuditLog({
      actorId: actor.userId,
      action: "USER_BULK_IMPORT",
      entity: "users",
      metadata: {
        totalRows: rows.length,
        importedCount: validEntries.length,
        failedCount: errors.length,
      },
    });

    revalidatePath("/users");
    revalidatePath("/guards");
    revalidatePath("/dashboard");
  }

  return {
    ok: validEntries.length > 0,
    total: rows.length,
    imported: validEntries.length,
    failed: errors.length,
    errors,
    message: `Successfully registered ${validEntries.length} user(s). ${
      errors.length > 0 ? `${errors.length} row(s) skipped due to errors.` : ""
    }`,
  };
}
