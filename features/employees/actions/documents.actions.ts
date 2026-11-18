"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { employeeDocumentTypeEnum, employeeDocuments, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";
import type { Role } from "@/lib/db/schema";
import { deleteFile, getSignedDownloadUrl, uploadFile } from "@/lib/firebase/firebase-admin";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const docSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(employeeDocumentTypeEnum.enumValues),
  title: z.string().trim().min(2, "Andika jina la hati").max(200),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe si sahihi")
    .optional(),
});

/** Office Assistant (if ever granted) may only touch employees of their own branch. */
async function employeeInActorScope(actor: { userId: string; role: Role }, employeeId: string) {
  const emp = await db.query.users.findFirst({
    where: eq(users.id, employeeId),
    columns: { id: true, branchId: true },
  });
  if (!emp) return false;
  const limit = await getStaffBranchLimit(actor.userId, actor.role);
  return limit === null || emp.branchId === limit;
}

/** Upload an ID / certificate / CV for an employee (SUPER_ADMIN / HR). */
export async function uploadEmployeeDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("EMPLOYEE_DOC_MANAGE");
  const get = (k: string) => (formData.get(k) as string | null) || undefined;
  const parsed = docSchema.safeParse({
    userId: get("userId"),
    type: get("type"),
    title: get("title"),
    expiresOn: get("expiresOn"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const v = parsed.data;

  if (!(await employeeInActorScope(actor, v.userId))) return { ok: false, error: "Mtumishi hapatikani." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Chagua faili." };
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, error: "Pakia PDF au picha (JPG, PNG, WEBP) pekee." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Faili lisizidi MB 5." };

  const fileUrl = await uploadFile(
    Buffer.from(await file.arrayBuffer()),
    file.name,
    file.type,
    `employee-documents/${v.userId}`
  );
  if (!fileUrl) return { ok: false, error: "Imeshindikana kupakia faili. Jaribu tena." };

  const [created] = await db
    .insert(employeeDocuments)
    .values({
      userId: v.userId,
      type: v.type,
      title: v.title,
      fileUrl,
      fileName: file.name.slice(0, 255),
      contentType: file.type,
      sizeBytes: file.size,
      expiresOn: v.expiresOn ?? null,
      uploadedById: actor.userId,
    })
    .returning({ id: employeeDocuments.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "EMPLOYEE_DOCUMENT_UPLOAD",
    entity: "employee_documents",
    entityId: created.id,
    metadata: { userId: v.userId, type: v.type, title: v.title },
  });
  revalidatePath(`/employees/${v.userId}`);
  return { ok: true, message: "Hati imepakiwa." };
}

/** Short-lived download link for an employee document. */
export async function getEmployeeDocumentUrl(
  documentId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const actor = await requirePermission("EMPLOYEE_DOC_VIEW");
  if (!z.string().uuid().safeParse(documentId).success) return { ok: false, error: "Ombi si sahihi." };
  const row = await db.query.employeeDocuments.findFirst({
    where: eq(employeeDocuments.id, documentId),
    columns: { userId: true, fileUrl: true, title: true },
  });
  if (!row || !(await employeeInActorScope(actor, row.userId))) {
    return { ok: false, error: "Hati haipatikani." };
  }
  const url = await getSignedDownloadUrl(row.fileUrl, 600);
  if (!url) return { ok: false, error: "Imeshindikana kupata kiungo. Jaribu tena." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "EMPLOYEE_DOCUMENT_VIEW",
    entity: "employee_documents",
    entityId: documentId,
    metadata: { userId: row.userId, title: row.title },
  });
  return { ok: true, url };
}

/** Delete an employee document and its stored file (SUPER_ADMIN / HR). */
export async function deleteEmployeeDocument(
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requirePermission("EMPLOYEE_DOC_MANAGE");
  if (!z.string().uuid().safeParse(documentId).success) return { ok: false, error: "Ombi si sahihi." };
  const row = await db.query.employeeDocuments.findFirst({
    where: eq(employeeDocuments.id, documentId),
    columns: { userId: true, fileUrl: true, title: true, type: true },
  });
  if (!row || !(await employeeInActorScope(actor, row.userId))) {
    return { ok: false, error: "Hati haipatikani." };
  }

  await db.delete(employeeDocuments).where(eq(employeeDocuments.id, documentId));
  await deleteFile(row.fileUrl);

  await writeAuditLog({
    actorId: actor.userId,
    action: "EMPLOYEE_DOCUMENT_DELETE",
    entity: "employee_documents",
    entityId: documentId,
    metadata: { userId: row.userId, type: row.type, title: row.title },
  });
  revalidatePath(`/employees/${row.userId}`);
  return { ok: true };
}
