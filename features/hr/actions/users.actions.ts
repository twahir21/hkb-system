"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, guardProfiles, branches, roleEnum, genderEnum, type Role, type Gender } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { isGuardRole } from "@/lib/auth/roles";
import { writeAuditLog } from "@/lib/auth/audit";
import { parseCsv, type BulkImportRowError, type BulkImportResult } from "@/lib/csv";

export type { BulkImportRowError, BulkImportResult } from "@/lib/csv";

export type UserActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  userId?: string;
};

const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Jina kamili liwe na angalau herufi 2").max(255),
  email: z.string().email("Barua pepe si sahihi"),
  username: z
    .string()
    .trim()
    .min(3, "Jina la mtumiaji liwe na angalau herufi 3")
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Jina la mtumiaji liwe na herufi, namba, nukta, vistari na mistari ya chini pekee"),
  role: z.enum(roleEnum.enumValues),
  gender: z.enum(genderEnum.enumValues).default("MALE"),
  password: z.string().min(6, "Nenosiri liwe na angalau herufi 6"),
  branchId: z.string().uuid("Choose a branch").optional(),
});

const userUpdateSchema = z.object({
  id: z.string().uuid("Namba ya mtumiaji si sahihi"),
  fullName: z.string().trim().min(2).max(255),
  role: z.enum(roleEnum.enumValues),
  gender: z.enum(genderEnum.enumValues).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  branchId: z.string().uuid("Choose a branch").optional(),
});

/**
 * Resolve and validate a user's branch. Missing branch → HQ.
 * Secretary works at HQ; Office Assistant owns a remote (non-HQ) branch.
 */
async function resolveBranch(
  role: Role,
  branchId: string | undefined
): Promise<{ ok: true; branchId: string | null } | { ok: false; error: string }> {
  const branch = branchId
    ? await db.query.branches.findFirst({ where: eq(branches.id, branchId) })
    : await db.query.branches.findFirst({ where: eq(branches.isHq, true) });
  if (branchId && !branch) return { ok: false, error: "Tawi ulilochagua halipo tena." };
  if (role === "OFFICE_ASSISTANT" && (!branch || branch.isHq)) {
    return { ok: false, error: "Msaidizi wa Ofisi lazima apangiwe tawi la mbali (si HQ)." };
  }
  // Secretary access spans all branches, so it (and Secretary + Supervisor) stays at HQ.
  if ((role === "SECRETARY" || role === "SECRETARY_SUPERVISOR") && branch && !branch.isHq) {
    return { ok: false, error: "Katibu hufanya kazi HQ. Tumia Msaidizi wa Ofisi kwa matawi ya mbali." };
  }
  return { ok: true, branchId: branch?.id ?? null };
}

/** Create a new system user / staff account (SUPER_ADMIN only) */
export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  const parsed = userCreateSchema.safeParse({
    fullName: formData.get("fullName") ?? undefined,
    email: (formData.get("email") as string)?.toLowerCase().trim() ?? undefined,
    username: formData.get("username") ?? undefined,
    role: formData.get("role") ?? undefined,
    gender: formData.get("gender") ?? undefined,
    password: formData.get("password") ?? undefined,
    branchId: formData.get("branchId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa za mtumiaji si sahihi" };
  }

  const v = parsed.data;
  const branch = await resolveBranch(v.role, v.branchId);
  if (!branch.ok) return { ok: false, error: branch.error };

  // Check if username or email is already taken
  const existing = await db.query.users.findFirst({
    where: or(
      eq(sql`lower(${users.email})`, v.email),
      eq(sql`lower(${users.username})`, v.username.toLowerCase())
    ),
  });

  if (existing) {
    if (existing.email.toLowerCase() === v.email) {
      return { ok: false, error: "Mtumiaji mwenye barua pepe hii tayari yupo." };
    }
    return { ok: false, error: "Jina hili la mtumiaji tayari limechukuliwa. Tafadhali chagua jingine." };
  }

  const passwordHash = await bcrypt.hash(v.password, 10);

  const [created] = await db
    .insert(users)
    .values({
      email: v.email,
      username: v.username,
      fullName: v.fullName,
      role: v.role,
      gender: v.gender,
      branchId: branch.branchId,
      passwordHash,
    })
    .returning({ id: users.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "USER_CREATE",
    entity: "users",
    entityId: created.id,
    metadata: { email: v.email, username: v.username, role: v.role, gender: v.gender, branchId: branch.branchId },
  });

  revalidatePath("/users");
  revalidatePath("/guards");
  revalidatePath("/dashboard");
  return { ok: true, userId: created.id, message: `Mtumiaji ${v.fullName} amesajiliwa.` };
}

/** Update an existing user's details / role / password */
export async function updateUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  const parsed = userUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    fullName: formData.get("fullName") ?? undefined,
    role: formData.get("role") ?? undefined,
    gender: formData.get("gender") ?? undefined,
    password: formData.get("password") ?? undefined,
    branchId: formData.get("branchId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  }

  const v = parsed.data;
  const branch = await resolveBranch(v.role, v.branchId);
  if (!branch.ok) return { ok: false, error: branch.error };

  const existing = await db.query.users.findFirst({
    where: eq(users.id, v.id),
  });

  if (!existing) {
    return { ok: false, error: "Mtumiaji hakupatikana." };
  }

  const updateData: {
    fullName: string;
    role: Role;
    gender?: Gender;
    passwordHash?: string;
    branchId: string | null;
    updatedAt: Date;
  } = {
    fullName: v.fullName,
    role: v.role,
    branchId: branch.branchId,
    ...(v.gender ? { gender: v.gender } : {}),
    updatedAt: new Date(),
  };

  if (v.password && v.password.trim().length > 0) {
    updateData.passwordHash = await bcrypt.hash(v.password, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, v.id));

  // Promotion out of the guard ranks (Guard / In-Charge): the guard profile stays for history (attendance,
  // payroll, debts) but is deactivated so the person stops appearing on shift
  // sheets, Mpangokazi, guard counts and the active guard list.
  // Back to Guard / In-Charge: reactivate it. Guard ↔ In-Charge keeps it active.
  let guardProfileChange: "deactivated" | "reactivated" | null = null;
  if (isGuardRole(existing.role) && !isGuardRole(v.role)) {
    const now = new Date();
    const res = await db
      .update(guardProfiles)
      .set({ isActive: false, disabledAt: now, updatedAt: now })
      .where(and(eq(guardProfiles.userId, v.id), eq(guardProfiles.isActive, true)))
      .returning({ id: guardProfiles.id });
    if (res.length) guardProfileChange = "deactivated";
  } else if (!isGuardRole(existing.role) && isGuardRole(v.role)) {
    const res = await db
      .update(guardProfiles)
      .set({ isActive: true, disabledAt: null, updatedAt: new Date() })
      .where(and(eq(guardProfiles.userId, v.id), eq(guardProfiles.isActive, false)))
      .returning({ id: guardProfiles.id });
    if (res.length) guardProfileChange = "reactivated";
  }

  await writeAuditLog({
    actorId: actor.userId,
    action: "USER_UPDATE",
    entity: "users",
    entityId: v.id,
    metadata: {
      role: v.role,
      previousRole: existing.role,
      gender: v.gender,
      branchId: branch.branchId,
      passwordChanged: Boolean(v.password),
      guardProfileChange,
    },
  });

  revalidatePath("/users");
  revalidatePath("/guards");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true, userId: v.id, message: "Mtumiaji amesasishwa." };
}

/** Delete a user from the system */
export async function deleteUser(userId: string): Promise<UserActionState> {
  const actor = await requirePermission("USER_MANAGE");

  if (actor.userId === userId) {
    return { ok: false, error: "Huwezi kufuta akaunti yako mwenyewe." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!existing) {
    return { ok: false, error: "Mtumiaji hakupatikana." };
  }

  // Guard accounts are never hard-deleted from here: deleting the user cascades
  // into guard_profiles and wipes attendance/credit history without any of the
  // Guard Registry's warnings. Use the registry instead — Delete (permanent,
  // with its own confirmation) or Disable (keeps history).
  const guardProfile = await db.query.guardProfiles.findFirst({
    where: eq(guardProfiles.userId, userId),
    columns: { id: true },
  });
  if (guardProfile) {
    return {
      ok: false,
      error:
        "Akaunti hii ni ya mlinzi. Isimamie kwenye Daftari la Walinzi — mfute mlinzi huko kabisa, au mzime ili kubaki na historia ya mahudhurio na mishahara.",
    };
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
  return { ok: true, message: "Mtumiaji amefutwa." };
}

/** Bulk register users from a CSV file */
export async function bulkImportUsers(formData: FormData): Promise<BulkImportResult> {
  const actor = await requirePermission("USER_MANAGE");

  const file = formData.get("file") as File | null;
  if (!file) {
    return { ok: false, total: 0, imported: 0, failed: 0, errors: [], error: "Hakuna faili la CSV lililowekwa." };
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
      error: "Faili la CSV ni tupu au halina mistari sahihi ya taarifa.",
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
    gender: Gender;
    branchId: string | null;
    passwordHash: string;
  }[] = [];

  // Optional "branch" column, matched by name (blank → HQ).
  const allBranches = await db.select().from(branches);
  const hq = allBranches.find((b) => b.isHq) ?? null;
  const branchByName = new Map(allBranches.map((b) => [b.name.toLowerCase(), b]));

  const errors: BulkImportRowError[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNum = idx + 2; // account for 1-based index & header row
    const row = rows[idx];

    const fullName = (row.fullname || row.name || "").trim();
    const email = (row.email || "").toLowerCase().trim();
    const username = (row.username || "").trim();
    const roleRaw = (row.role || "").toUpperCase().trim();
    const rawGender = (row.gender || row.sex || "MALE").toUpperCase().trim();
    const gender: Gender = rawGender === "FEMALE" ? "FEMALE" : "MALE";
    const password = (row.password || "").trim();

    const identifier = email || username || fullName || `Row #${rowNum}`;

    if (!fullName || fullName.length < 2) {
      errors.push({ row: rowNum, identifier, reason: "Jina kamili halipo au lina herufi chini ya 2" });
      continue;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, identifier, reason: `Barua pepe si sahihi: '${email}'` });
      continue;
    }

    if (!username || username.length < 3) {
      errors.push({ row: rowNum, identifier, reason: "Jina la mtumiaji liwe na angalau herufi 3" });
      continue;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errors.push({
        row: rowNum,
        identifier,
        reason: "Jina la mtumiaji lina herufi zisizoruhusiwa (herufi, namba, nukta, vistari, mistari ya chini pekee)",
      });
      continue;
    }

    const validRoles = roleEnum.enumValues as readonly string[];
    if (!validRoles.includes(roleRaw)) {
      errors.push({
        row: rowNum,
        identifier,
        reason: `Cheo '${roleRaw}' si sahihi. Lazima kiwe kimoja kati ya: ${validRoles.join(", ")}`,
      });
      continue;
    }

    if (!password || password.length < 6) {
      errors.push({ row: rowNum, identifier, reason: "Nenosiri liwe na angalau herufi 6" });
      continue;
    }

    const branchRaw = (row.branch || "").trim();
    const branch = branchRaw ? branchByName.get(branchRaw.toLowerCase()) : hq;
    if (branchRaw && !branch) {
      errors.push({
        row: rowNum,
        identifier,
        reason: `Tawi '${branchRaw}' halijulikani. Lazima liwe moja kati ya: ${allBranches.map((b) => b.name).join(", ")}`,
      });
      continue;
    }
    if (roleRaw === "OFFICE_ASSISTANT" && (!branch || branch.isHq)) {
      errors.push({ row: rowNum, identifier, reason: "Msaidizi wa Ofisi anahitaji tawi la mbali (si HQ)" });
      continue;
    }
    if ((roleRaw === "SECRETARY" || roleRaw === "SECRETARY_SUPERVISOR") && branch && !branch.isHq) {
      errors.push({ row: rowNum, identifier, reason: "Katibu lazima awe HQ" });
      continue;
    }

    // Check collisions with DB
    if (existingEmails.has(email)) {
      errors.push({ row: rowNum, identifier, reason: `Barua pepe '${email}' tayari imesajiliwa kwenye mfumo` });
      continue;
    }

    if (existingUsernames.has(username.toLowerCase())) {
      errors.push({
        row: rowNum,
        identifier,
        reason: `Jina la mtumiaji '${username}' tayari linatumiwa na akaunti nyingine`,
      });
      continue;
    }

    // Check collisions inside the CSV batch itself
    if (seenInBatchEmails.has(email)) {
      errors.push({ row: rowNum, identifier, reason: `Barua pepe '${email}' imejirudia kwenye CSV hiyo hiyo` });
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
      gender,
      branchId: branch?.id ?? null,
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
    message: `Watumiaji ${validEntries.length} wamesajiliwa. ${
      errors.length > 0 ? `Mistari ${errors.length} imerukwa kwa sababu ya makosa.` : ""
    }`,
  };
}
