"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches, trainingAttendees, trainings, users, type Role } from "@/lib/db/schema";
import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";
import { canManageBranch, getManageBranchLimit } from "@/lib/auth/branch-limit";
import { deleteFile, getSignedDownloadUrl, uploadFile } from "@/lib/firebase/firebase-admin";
import { writeAuditLog } from "@/lib/auth/audit";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe si sahihi");

const NOT_YOUR_BRANCH = "Unaweza kusimamia mafunzo ya tawi lako pekee.";

/** Office Assistant may only touch its own branch's trainings. null = training not found. */
async function trainingInActorBranch(actor: { userId: string; role: Role }, trainingId: string) {
  const tr = await db.query.trainings.findFirst({ where: eq(trainings.id, trainingId), columns: { branchId: true } });
  if (!tr) return null;
  return canManageBranch(await getManageBranchLimit(actor), tr.branchId);
}

const trainingSchema = z
  .object({
    title: z.string().trim().min(3, "Andika jina la mafunzo").max(200),
    trainer: z.string().trim().min(2, "Andika mkufunzi").max(200),
    startDate: DATE,
    endDate: DATE.optional(),
    venue: z.string().trim().min(2, "Andika mahali").max(255),
    branchId: z.string().uuid().optional(),
    description: z.string().trim().max(5000).optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "Tarehe ya mwisho iko kabla ya kuanza",
  });

/** Schedule a training session (HQ office). */
export async function createTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("TRAINING_MANAGE");
  const get = (k: string) => ((formData.get(k) as string | null) ?? "").trim() || undefined;
  const parsed = trainingSchema.safeParse({
    title: get("title"),
    trainer: get("trainer"),
    startDate: get("startDate"),
    endDate: get("endDate"),
    venue: get("venue"),
    branchId: get("branchId"),
    description: get("description"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const v = parsed.data;

  // Office Assistant: trainings of its own branch only.
  const limit = await getManageBranchLimit(actor);
  if (limit === "none") return { ok: false, error: NOT_YOUR_BRANCH };
  if (limit !== null) {
    if (v.branchId && v.branchId !== limit) return { ok: false, error: NOT_YOUR_BRANCH };
    v.branchId = limit;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });
  if (v.startDate < today) return { ok: false, error: "Tarehe ya mafunzo imeshapita." };

  if (v.branchId) {
    const b = await db.query.branches.findFirst({ where: eq(branches.id, v.branchId), columns: { id: true } });
    if (!b) return { ok: false, error: "Tawi halipatikani." };
  }

  const [created] = await db
    .insert(trainings)
    .values({
      title: v.title,
      trainer: v.trainer,
      startDate: v.startDate,
      endDate: v.endDate ?? v.startDate,
      venue: v.venue,
      branchId: v.branchId ?? null,
      description: v.description ?? null,
      createdById: actor.userId,
    })
    .returning({ id: trainings.id });

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_CREATE",
    entity: "trainings",
    entityId: created.id,
    metadata: { title: v.title, startDate: v.startDate, branchId: v.branchId ?? null },
  });
  revalidatePath("/trainings");
  revalidatePath("/calendar");
  return { ok: true, message: "Mafunzo yamepangwa." };
}

/** Cancel a scheduled training (HQ office). */
export async function cancelTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("TRAINING_MANAGE");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Ombi si sahihi." };
  const allowed = await trainingInActorBranch(actor, id.data);
  if (allowed === null) return { ok: false, error: "Mafunzo hayapatikani." };
  if (!allowed) return { ok: false, error: NOT_YOUR_BRANCH };

  const [row] = await db
    .update(trainings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(and(eq(trainings.id, id.data), eq(trainings.status, "SCHEDULED")))
    .returning({ title: trainings.title });
  if (!row) return { ok: false, error: "Mafunzo hayapatikani au yameshaghairiwa." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_CANCEL",
    entity: "trainings",
    entityId: id.data,
    metadata: { title: row.title },
  });
  revalidatePath("/trainings");
  revalidatePath("/calendar");
  return { ok: true, message: "Mafunzo yameghairiwa." };
}

const eatToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });

type Result = { ok: true } | { ok: false; error: string };

function revalidateTraining(trainingId: string, userIds: string[] = []) {
  revalidatePath("/trainings");
  revalidatePath(`/trainings/${trainingId}`);
  for (const u of userIds) revalidatePath(`/employees/${u}`);
}

/** Enrol employees / guards in a training (HQ office). Branch trainings take that branch's people only. */
export async function addTrainingAttendees(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("TRAINING_MANAGE");
  const parsed = z
    .object({
      trainingId: z.string().uuid(),
      userIds: z.array(z.string().uuid()).min(1, "Chagua angalau mshiriki mmoja").max(1000),
    })
    .safeParse({
      trainingId: formData.get("trainingId"),
      userIds: [...new Set(formData.getAll("userIds").map(String))],
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ombi si sahihi." };
  const { trainingId, userIds } = parsed.data;

  const training = await db.query.trainings.findFirst({
    where: eq(trainings.id, trainingId),
    columns: { title: true, status: true, branchId: true },
  });
  if (!training) return { ok: false, error: "Mafunzo hayapatikani." };
  if (!canManageBranch(await getManageBranchLimit(actor), training.branchId)) return { ok: false, error: NOT_YOUR_BRANCH };
  if (training.status === "CANCELLED") return { ok: false, error: "Mafunzo yameghairiwa." };

  const valid = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, userIds), training.branchId ? eq(users.branchId, training.branchId) : undefined));
  if (valid.length !== userIds.length) return { ok: false, error: "Baadhi ya washiriki hawapatikani kwenye tawi hili." };

  const inserted = await db
    .insert(trainingAttendees)
    .values(userIds.map((userId) => ({ trainingId, userId, addedById: actor.userId })))
    .onConflictDoNothing()
    .returning({ userId: trainingAttendees.userId });

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_ATTENDEES_ADD",
    entity: "trainings",
    entityId: trainingId,
    metadata: { title: training.title, added: inserted.length },
  });
  revalidateTraining(trainingId, inserted.map((r) => r.userId));
  return { ok: true, message: `Washiriki ${inserted.length} wameongezwa.` };
}

/** Remove someone from a training, with their certificate file (HQ office). */
export async function removeTrainingAttendee(trainingId: string, userId: string): Promise<Result> {
  const actor = await requirePermission("TRAINING_MANAGE");
  if (!z.string().uuid().safeParse(trainingId).success || !z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Ombi si sahihi." };
  }
  const allowed = await trainingInActorBranch(actor, trainingId);
  if (allowed === null) return { ok: false, error: "Mafunzo hayapatikani." };
  if (!allowed) return { ok: false, error: NOT_YOUR_BRANCH };
  const [row] = await db
    .delete(trainingAttendees)
    .where(and(eq(trainingAttendees.trainingId, trainingId), eq(trainingAttendees.userId, userId)))
    .returning({ fileUrl: trainingAttendees.certificateFileUrl });
  if (!row) return { ok: false, error: "Mshiriki hapatikani." };
  await deleteFile(row.fileUrl);

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_ATTENDEE_REMOVE",
    entity: "trainings",
    entityId: trainingId,
    metadata: { userId },
  });
  revalidateTraining(trainingId, [userId]);
  return { ok: true };
}

/** Mark attendance once the training has started. Marking ABSENT clears completion. */
export async function setTrainingAttendance(
  trainingId: string,
  userId: string,
  attendance: "PRESENT" | "ABSENT" | "PENDING"
): Promise<Result> {
  const actor = await requirePermission("TRAINING_MANAGE");
  const parsed = z
    .object({ trainingId: z.string().uuid(), userId: z.string().uuid(), attendance: z.enum(["PRESENT", "ABSENT", "PENDING"]) })
    .safeParse({ trainingId, userId, attendance });
  if (!parsed.success) return { ok: false, error: "Ombi si sahihi." };

  const training = await db.query.trainings.findFirst({
    where: eq(trainings.id, trainingId),
    columns: { status: true, startDate: true, branchId: true },
  });
  if (!training) return { ok: false, error: "Mafunzo hayapatikani." };
  if (!canManageBranch(await getManageBranchLimit(actor), training.branchId)) return { ok: false, error: NOT_YOUR_BRANCH };
  if (training.status === "CANCELLED") return { ok: false, error: "Mafunzo yameghairiwa." };
  if (training.startDate > eatToday()) return { ok: false, error: "Mafunzo bado hayajaanza." };

  const [row] = await db
    .update(trainingAttendees)
    .set({
      attendance,
      ...(attendance !== "PRESENT" ? { completed: false, completedOn: null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(trainingAttendees.trainingId, trainingId), eq(trainingAttendees.userId, userId)))
    .returning({ userId: trainingAttendees.userId });
  if (!row) return { ok: false, error: "Mshiriki hapatikani." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_ATTENDANCE_MARK",
    entity: "trainings",
    entityId: trainingId,
    metadata: { userId, attendance },
  });
  revalidateTraining(trainingId, [userId]);
  return { ok: true };
}

const CERT_MAX_BYTES = 5 * 1024 * 1024;
const CERT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

/**
 * Completion / certificate record for one attendee (must be marked PRESENT).
 * A new certificate file replaces the old one; "removeFile" drops it.
 */
export async function saveTrainingCompletion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("TRAINING_MANAGE");
  const get = (k: string) => ((formData.get(k) as string | null) ?? "").trim() || undefined;
  const parsed = z
    .object({
      trainingId: z.string().uuid(),
      userId: z.string().uuid(),
      completed: z.boolean(),
      completedOn: DATE.optional(),
      certificateNo: z.string().trim().max(100, "Namba ya cheti isizidi herufi 100").optional(),
    })
    .safeParse({
      trainingId: get("trainingId"),
      userId: get("userId"),
      completed: formData.get("completed") === "on",
      completedOn: get("completedOn"),
      certificateNo: get("certificateNo"),
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const v = parsed.data;
  const removeFile = formData.get("removeFile") === "on";

  const [current] = await db
    .select({
      attendance: trainingAttendees.attendance,
      fileUrl: trainingAttendees.certificateFileUrl,
      startDate: trainings.startDate,
      status: trainings.status,
      title: trainings.title,
      branchId: trainings.branchId,
    })
    .from(trainingAttendees)
    .innerJoin(trainings, eq(trainingAttendees.trainingId, trainings.id))
    .where(and(eq(trainingAttendees.trainingId, v.trainingId), eq(trainingAttendees.userId, v.userId)))
    .limit(1);
  if (!current) return { ok: false, error: "Mshiriki hapatikani." };
  if (!canManageBranch(await getManageBranchLimit(actor), current.branchId)) return { ok: false, error: NOT_YOUR_BRANCH };
  if (current.status === "CANCELLED") return { ok: false, error: "Mafunzo yameghairiwa." };
  if (current.attendance !== "PRESENT") return { ok: false, error: "Weka kwanza kuwa mshiriki alihudhuria." };
  if (v.completedOn && v.completedOn < current.startDate) {
    return { ok: false, error: "Tarehe ya kuhitimu iko kabla ya mafunzo kuanza." };
  }
  if (v.completedOn && v.completedOn > eatToday()) return { ok: false, error: "Tarehe ya kuhitimu bado haijafika." };

  const file = formData.get("file");
  let fileUrl: string | null | undefined; // undefined = keep current
  let fileName: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    if (!v.completed) return { ok: false, error: "Weka alama ya kuhitimu kabla ya kupakia cheti." };
    if (!CERT_TYPES.has(file.type)) return { ok: false, error: "Pakia PDF au picha (JPG, PNG, WEBP) pekee." };
    if (file.size > CERT_MAX_BYTES) return { ok: false, error: "Faili lisizidi MB 5." };
    fileUrl = await uploadFile(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      file.type,
      `training-certificates/${v.trainingId}`
    );
    if (!fileUrl) return { ok: false, error: "Imeshindikana kupakia faili. Jaribu tena." };
    fileName = file.name.slice(0, 255);
  } else if (removeFile || !v.completed) {
    fileUrl = null;
    fileName = null;
  }

  await db
    .update(trainingAttendees)
    .set({
      completed: v.completed,
      completedOn: v.completed ? (v.completedOn ?? eatToday()) : null,
      certificateNo: v.completed ? (v.certificateNo ?? null) : null,
      ...(fileUrl !== undefined ? { certificateFileUrl: fileUrl, certificateFileName: fileName } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(trainingAttendees.trainingId, v.trainingId), eq(trainingAttendees.userId, v.userId)));

  // Old certificate replaced or removed: drop it from storage.
  if (fileUrl !== undefined && current.fileUrl) await deleteFile(current.fileUrl);

  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_COMPLETION_SAVE",
    entity: "trainings",
    entityId: v.trainingId,
    metadata: { title: current.title, userId: v.userId, completed: v.completed, certificateNo: v.certificateNo ?? null },
  });
  revalidateTraining(v.trainingId, [v.userId]);
  return { ok: true, message: "Rekodi imehifadhiwa." };
}

/**
 * Short-lived link to a training certificate. Allowed for the certificate holder,
 * training office (TRAINING_VIEW_ALL) and employee-record viewers within their branch scope.
 */
export async function getTrainingCertificateUrl(
  trainingId: string,
  userId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, error: "Ingia kwanza." };
  if (!z.string().uuid().safeParse(trainingId).success || !z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: "Ombi si sahihi." };
  }

  const [row] = await db
    .select({ fileUrl: trainingAttendees.certificateFileUrl, branchId: users.branchId })
    .from(trainingAttendees)
    .innerJoin(users, eq(trainingAttendees.userId, users.id))
    .where(and(eq(trainingAttendees.trainingId, trainingId), eq(trainingAttendees.userId, userId)))
    .limit(1);
  if (!row?.fileUrl) return { ok: false, error: "Cheti hakipatikani." };

  let allowed = actor.userId === userId || hasPermission(actor.role, "TRAINING_VIEW_ALL");
  if (!allowed && hasPermission(actor.role, "EMPLOYEE_VIEW")) {
    const limit = await getStaffBranchLimit(actor.userId, actor.role);
    allowed = limit === null || row.branchId === limit;
  }
  if (!allowed) return { ok: false, error: "Cheti hakipatikani." };

  const url = await getSignedDownloadUrl(row.fileUrl, 600);
  if (!url) return { ok: false, error: "Imeshindikana kupata kiungo. Jaribu tena." };
  await writeAuditLog({
    actorId: actor.userId,
    action: "TRAINING_CERTIFICATE_VIEW",
    entity: "trainings",
    entityId: trainingId,
    metadata: { userId },
  });
  return { ok: true, url };
}
