"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardProfiles, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { guardSchema } from "@/features/hr/validators/guard.schema";
import { parseCsv, type BulkImportRowError, type BulkImportResult } from "@/lib/csv";

export type { BulkImportRowError, BulkImportResult } from "@/lib/csv";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type GuardState = ActionState & { guardId?: string };

/** Create a guard: links/stamps the user row and inserts their profile (PII). */
export async function createGuard(
  _prev: GuardState,
  formData: FormData,
): Promise<GuardState> {
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
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid guard data",
    };
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
      .values({
        googleId: "",
        email: v.email,
        fullName: v.fullName,
        role: "GUARD",
      })
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
export async function updateGuard(
  _prev: GuardState,
  formData: FormData,
): Promise<GuardState> {
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
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid update",
    };
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

const SUPERVISOR_ROLES = ["SUPERVISOR", "SENIOR_SUPERVISOR", "SUPER_ADMIN"] as const;

/** Bulk register guards from a CSV file (mirrors bulkImportUsers). */
export async function bulkImportGuards(formData: FormData): Promise<BulkImportResult> {
  const actor = await requirePermission("GUARD_MANAGE");

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

  // Existing employee IDs for fast collision check (employee_id is unique)
  const existingIds = await db
    .select({ employeeId: guardProfiles.employeeId })
    .from(guardProfiles);
  const existingEmployeeIds = new Set(existingIds.map((g) => g.employeeId.toLowerCase()));

  const seenInBatchEmployeeIds = new Set<string>();
  const seenInBatchEmails = new Set<string>();
  const errors: BulkImportRowError[] = [];

  const validEntries: {
    email: string;
    fullName: string;
    employeeId: string;
    age: number;
    phone: string;
    homeLocation: string;
    workLocation: string;
    kinName: string;
    kinRelation: string;
    kinPhone: string;
    registrationDate: string;
    supervisorEmail: string;
  }[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rowNum = idx + 2; // account for 1-based index & header row
    const row = rows[idx];
    const email = (row.email || "").toLowerCase().trim();
    const employeeId = (row.employeeid || "").trim();
    const identifier = employeeId || email || `Row #${rowNum}`;

    const parsed = guardSchema.safeParse({
      email: email || undefined,
      fullName: (row.fullname || row.name || "").trim() || undefined,
      employeeId: employeeId || undefined,
      age: (row.age || "").trim() || undefined,
      phone: (row.phone || "").trim() || undefined,
      homeLocation: (row.homelocation || "").trim() || undefined,
      workLocation: (row.worklocation || "").trim() || undefined,
      kinName: (row.kinname || "").trim() || undefined,
      kinRelation: (row.kinrelation || "").trim() || undefined,
      kinPhone: (row.kinphone || "").trim() || undefined,
      registrationDate: (row.registrationdate || "").trim() || undefined,
      assignedSupervisorId: null,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({
        row: rowNum,
        identifier,
        reason: `${issue?.path.join(".") || "row"}: ${issue?.message || "Invalid guard data"}`,
      });
      continue;
    }
    const v = parsed.data;

    if (existingEmployeeIds.has(v.employeeId.toLowerCase())) {
      errors.push({ row: rowNum, identifier, reason: `Employee ID '${v.employeeId}' is already registered in the system` });
      continue;
    }

    if (seenInBatchEmployeeIds.has(v.employeeId.toLowerCase())) {
      errors.push({ row: rowNum, identifier, reason: `Duplicate employee ID '${v.employeeId}' found in the same CSV` });
      continue;
    }

    if (seenInBatchEmails.has(v.email)) {
      errors.push({ row: rowNum, identifier, reason: `Duplicate email '${v.email}' found in the same CSV` });
      continue;
    }

    seenInBatchEmployeeIds.add(v.employeeId.toLowerCase());
    seenInBatchEmails.add(v.email);

    validEntries.push({
      email: v.email,
      fullName: v.fullName,
      employeeId: v.employeeId,
      age: v.age,
      phone: v.phone,
      homeLocation: v.homeLocation,
      workLocation: v.workLocation,
      kinName: v.kinName,
      kinRelation: v.kinRelation,
      kinPhone: v.kinPhone,
      registrationDate: v.registrationDate,
      supervisorEmail: (row.supervisoremail || "").toLowerCase().trim(),
    });
  }

  await insertImportedGuards(actor.userId, rows.length, validEntries, errors);

  const failedRows = errors.filter((e) => e.row !== 0).length;
  return {
    ok: validEntries.length > 0,
    total: rows.length,
    imported: validEntries.length,
    failed: failedRows,
    errors,
    message: `Successfully registered ${validEntries.length} guard(s). ${
      failedRows > 0 ? `${failedRows} row(s) skipped due to errors.` : ""
    }`,
  };
}

/** Resolve supervisors, find/create users by email, then insert guard profiles. */
async function insertImportedGuards(
  actorId: string,
  totalRows: number,
  validEntries: {
    email: string;
    fullName: string;
    employeeId: string;
    age: number;
    phone: string;
    homeLocation: string;
    workLocation: string;
    kinName: string;
    kinRelation: string;
    kinPhone: string;
    registrationDate: string;
    supervisorEmail: string;
  }[],
  errors: BulkImportRowError[],
): Promise<number> {
  if (validEntries.length === 0) return 0;

  // Resolve optional supervisor emails in one query
  const supervisorEmails = [...new Set(validEntries.map((e) => e.supervisorEmail).filter(Boolean))];
  const supervisorIdByEmail = new Map<string, string>();
  if (supervisorEmails.length > 0) {
    const supervisors = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(inArray(users.email, supervisorEmails));
    for (const s of supervisors) {
      if (s.role && (SUPERVISOR_ROLES as readonly string[]).includes(s.role)) {
        supervisorIdByEmail.set(s.email.toLowerCase(), s.id);
      }
    }
  }

  for (const e of validEntries) {
    if (e.supervisorEmail && !supervisorIdByEmail.has(e.supervisorEmail)) {
      errors.push({
        row: 0,
        identifier: e.employeeId,
        reason: `Supervisor '${e.supervisorEmail}' not found — imported without supervisor assignment`,
      });
    }
  }

  // Find existing users by email (createGuard reuses the user row when present)
  const emails = [...new Set(validEntries.map((e) => e.email))];
  const userIdByEmail = new Map<string, string>();
  const existingUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails));
  for (const u of existingUsers) userIdByEmail.set(u.email.toLowerCase(), u.id);

  // Create missing user rows (same shape as createGuard)
  const missingUsers = emails
    .filter((e) => !userIdByEmail.has(e))
    .map((e) => ({
      googleId: "",
      email: e,
      fullName: validEntries.find((x) => x.email === e)!.fullName,
      role: "GUARD" as const,
    }));

  if (missingUsers.length > 0) {
    const created = await db
      .insert(users)
      .values(missingUsers)
      .returning({ id: users.id, email: users.email });
    for (const u of created) userIdByEmail.set(u.email.toLowerCase(), u.id);
  }

  // Insert profiles
  await db.insert(guardProfiles).values(
    validEntries.map((e) => ({
      userId: userIdByEmail.get(e.email)!,
      employeeId: e.employeeId,
      age: e.age,
      phone: e.phone,
      homeLocation: e.homeLocation,
      workLocation: e.workLocation,
      kinName: e.kinName,
      kinRelation: e.kinRelation,
      kinPhone: e.kinPhone,
      registrationDate: e.registrationDate,
      assignedSupervisorId: supervisorIdByEmail.get(e.supervisorEmail) ?? null,
    })),
  );

  await writeAuditLog({
    actorId,
    action: "GUARD_BULK_IMPORT",
    entity: "guard_profiles",
    metadata: {
      totalRows,
      importedCount: validEntries.length,
      failedCount: errors.filter((e) => e.row !== 0).length,
    },
  });

  revalidatePath("/guards");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");

  return validEntries.length;
}
