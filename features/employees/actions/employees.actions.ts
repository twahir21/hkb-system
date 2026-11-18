"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  contractStatusEnum,
  contractTypeEnum,
  contracts,
  departmentEnum,
  employeeProfiles,
  users,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { getSignedDownloadUrl, uploadFile } from "@/lib/firebase/firebase-admin";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const optional = (max: number) => z.string().trim().max(max).optional();
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe si sahihi");

const profileSchema = z.object({
  userId: z.string().uuid(),
  employeeNo: optional(50),
  department: z.enum(departmentEnum.enumValues),
  jobTitle: z.string().trim().min(2, "Andika wadhifa").max(150),
  hireDate: DATE.optional(),
  phone: optional(20),
  nidaNo: optional(30),
  address: optional(255),
  kinName: optional(255),
  kinPhone: optional(20),
});

/** Create or update an employee's HR profile (SUPER_ADMIN / HR). */
export async function saveEmployeeProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("EMPLOYEE_MANAGE");
  const get = (k: string) => (formData.get(k) as string | null) || undefined;
  const parsed = profileSchema.safeParse({
    userId: get("userId"),
    employeeNo: get("employeeNo"),
    department: get("department"),
    jobTitle: get("jobTitle"),
    hireDate: get("hireDate"),
    phone: get("phone"),
    nidaNo: get("nidaNo"),
    address: get("address"),
    kinName: get("kinName"),
    kinPhone: get("kinPhone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const { userId, ...v } = parsed.data;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } });
  if (!user) return { ok: false, error: "Mtumishi hapatikani." };

  const values = {
    employeeNo: v.employeeNo ?? null,
    department: v.department,
    jobTitle: v.jobTitle,
    hireDate: v.hireDate ?? null,
    phone: v.phone ?? null,
    nidaNo: v.nidaNo ?? null,
    address: v.address ?? null,
    kinName: v.kinName ?? null,
    kinPhone: v.kinPhone ?? null,
    updatedAt: new Date(),
  };
  try {
    await db
      .insert(employeeProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: employeeProfiles.userId, set: values });
  } catch {
    return { ok: false, error: "Namba ya mtumishi tayari inatumika." };
  }

  await writeAuditLog({
    actorId: actor.userId,
    action: "EMPLOYEE_PROFILE_SAVE",
    entity: "employee_profiles",
    entityId: userId,
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${userId}`);
  return { ok: true, message: "Taarifa zimehifadhiwa." };
}

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const contractSchema = z
  .object({
    userId: z.string().uuid(),
    type: z.enum(contractTypeEnum.enumValues),
    position: z.string().trim().min(2, "Andika wadhifa").max(150),
    startDate: DATE,
    endDate: DATE.optional(),
    monthlySalary: z.coerce.number().nonnegative().max(1e10).optional(),
    notes: optional(2000),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "Tarehe ya mwisho iko kabla ya kuanza",
  })
  .refine((v) => v.type === "PERMANENT" || Boolean(v.endDate), {
    message: "Weka tarehe ya mwisho wa mkataba",
  });

/** Add a contract, optionally with the signed PDF (SUPER_ADMIN / HR). */
export async function addContract(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("CONTRACT_MANAGE");
  const get = (k: string) => (formData.get(k) as string | null) || undefined;
  const parsed = contractSchema.safeParse({
    userId: get("userId"),
    type: get("type"),
    position: get("position"),
    startDate: get("startDate"),
    endDate: get("endDate"),
    monthlySalary: get("monthlySalary"),
    notes: get("notes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Mkataba si sahihi" };
  const v = parsed.data;

  let documentUrl: string | null = null;
  const file = formData.get("document");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { ok: false, error: "Pakia PDF pekee." };
    if (file.size > MAX_PDF_BYTES) return { ok: false, error: "PDF isizidi MB 5." };
    documentUrl = await uploadFile(Buffer.from(await file.arrayBuffer()), file.name, file.type, "contracts");
    if (!documentUrl) return { ok: false, error: "Imeshindikana kupakia PDF. Jaribu tena." };
  }

  const [created] = await db
    .insert(contracts)
    .values({
      userId: v.userId,
      type: v.type,
      position: v.position,
      startDate: v.startDate,
      endDate: v.endDate ?? null,
      monthlySalary: v.monthlySalary !== undefined ? String(v.monthlySalary) : null,
      notes: v.notes ?? null,
      documentUrl,
      createdById: actor.userId,
    })
    .returning({ id: contracts.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "CONTRACT_CREATE",
    entity: "contracts",
    entityId: created.id,
    metadata: { userId: v.userId, type: v.type, endDate: v.endDate ?? null },
  });
  revalidatePath(`/employees/${v.userId}`);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return { ok: true, message: "Mkataba umeongezwa." };
}

/** End or terminate a contract (SUPER_ADMIN / HR). */
export async function setContractStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("CONTRACT_MANAGE");
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(contractStatusEnum.enumValues) })
    .safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return { ok: false, error: "Ombi si sahihi." };

  const [row] = await db
    .update(contracts)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(contracts.id, parsed.data.id))
    .returning({ userId: contracts.userId });
  if (!row) return { ok: false, error: "Mkataba haupatikani." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "CONTRACT_STATUS",
    entity: "contracts",
    entityId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });
  revalidatePath(`/employees/${row.userId}`);
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return { ok: true, message: "Hali ya mkataba imebadilishwa." };
}

/** Short-lived download link for a signed contract PDF (contract viewers only). */
export async function getContractDocumentUrl(
  contractId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requirePermission("CONTRACT_VIEW");
  if (!z.string().uuid().safeParse(contractId).success) return { ok: false, error: "Ombi si sahihi." };
  const row = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
    columns: { documentUrl: true },
  });
  if (!row?.documentUrl) return { ok: false, error: "Hakuna PDF ya mkataba huu." };
  const url = await getSignedDownloadUrl(row.documentUrl, 600);
  if (!url) return { ok: false, error: "Imeshindikana kupata kiungo. Jaribu tena." };
  return { ok: true, url };
}
