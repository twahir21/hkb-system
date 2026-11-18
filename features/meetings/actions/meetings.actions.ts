"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches, meetingInvitees, meetings, users, type Role } from "@/lib/db/schema";
import { GUARD_ROLES } from "@/lib/auth/roles";
import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { canManageBranch, getManageBranchLimit } from "@/lib/auth/branch-limit";
import { deleteFile, getSignedDownloadUrl, uploadFile } from "@/lib/firebase/firebase-admin";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import { getMeetingMinutesFile, getMeetingScope } from "@/features/meetings/queries/meetings";

/** datetime-local value ("YYYY-MM-DDTHH:mm") entered in Tanzania time (EAT, UTC+3). */
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const toEat = (v: string) => new Date(`${v}:00+03:00`);

const NOT_YOUR_BRANCH = "Unaweza kusimamia vikao vya tawi lako pekee.";

/** Office Assistant may only touch its own branch's meetings. */
async function meetingInActorBranch(actor: { userId: string; role: Role }, meetingId: string) {
  const m = await db.query.meetings.findFirst({ where: eq(meetings.id, meetingId), columns: { branchId: true } });
  if (!m) return null;
  return canManageBranch(await getManageBranchLimit(actor), m.branchId);
}

const meetingSchema = z
  .object({
    title: z.string().trim().min(3, "Andika kichwa cha kikao").max(200),
    startsAt: z.string().regex(LOCAL_DT, "Weka tarehe na saa ya kuanza"),
    endsAt: z.string().regex(LOCAL_DT, "Saa ya kumaliza si sahihi").optional(),
    venue: z.string().trim().max(255).optional(),
    onlineLink: z
      .string()
      .trim()
      .max(1000)
      .url("Kiungo si sahihi")
      .refine((u) => /^https:\/\//i.test(u), "Kiungo kianze na https://")
      .optional(),
    branchId: z.string().uuid().optional(),
    agenda: z.string().trim().min(3, "Andika ajenda").max(5000),
    invitees: z.array(z.string().uuid()).min(1, "Chagua angalau mwalikwa mmoja").max(500),
  })
  .refine((v) => Boolean(v.venue || v.onlineLink), {
    message: "Weka mahali au kiungo cha mtandaoni",
  })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, {
    message: "Saa ya kumaliza iko kabla ya kuanza",
  });

/** Schedule a meeting with its invitees (HQ office). */
export async function createMeeting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("MEETING_MANAGE");
  const get = (k: string) => ((formData.get(k) as string | null) ?? "").trim() || undefined;
  const parsed = meetingSchema.safeParse({
    title: get("title"),
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    venue: get("venue"),
    onlineLink: get("onlineLink"),
    branchId: get("branchId"),
    agenda: get("agenda"),
    invitees: [...new Set(formData.getAll("invitees").map(String))],
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const v = parsed.data;

  // Office Assistant: the meeting belongs to its own branch, invitees come from it.
  const limit = await getManageBranchLimit(actor);
  if (limit === "none") return { ok: false, error: NOT_YOUR_BRANCH };
  if (limit !== null) {
    if (v.branchId && v.branchId !== limit) return { ok: false, error: NOT_YOUR_BRANCH };
    v.branchId = limit;
  }

  const startsAt = toEat(v.startsAt);
  if (startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
    return { ok: false, error: "Tarehe ya kikao imeshapita." };
  }

  if (v.branchId) {
    const b = await db.query.branches.findFirst({ where: eq(branches.id, v.branchId), columns: { id: true } });
    if (!b) return { ok: false, error: "Tawi halipatikani." };
  }

  // Only real, non-guard staff can be invited.
  const valid = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.id, v.invitees),
        notInArray(users.role, [...GUARD_ROLES]),
        limit !== null ? eq(users.branchId, limit) : undefined
      )
    );
  if (valid.length !== v.invitees.length) return { ok: false, error: "Baadhi ya walioalikwa hawapatikani." };

  // neon-http has no interactive transactions: pre-generate the id and batch both inserts.
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(meetings).values({
      id,
      title: v.title,
      startsAt,
      endsAt: v.endsAt ? toEat(v.endsAt) : null,
      venue: v.venue ?? null,
      onlineLink: v.onlineLink ?? null,
      branchId: v.branchId ?? null,
      agenda: v.agenda,
      createdById: actor.userId,
    }),
    db.insert(meetingInvitees).values(v.invitees.map((userId) => ({ meetingId: id, userId }))),
  ]);

  await writeAuditLog({
    actorId: actor.userId,
    action: "MEETING_CREATE",
    entity: "meetings",
    entityId: id,
    metadata: { title: v.title, startsAt: startsAt.toISOString(), invitees: v.invitees.length },
  });
  revalidatePath("/meetings");
  redirect(`/meetings/${id}`);
}

/** Cancel a scheduled meeting (HQ office). */
export async function cancelMeeting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("MEETING_MANAGE");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Ombi si sahihi." };
  const allowed = await meetingInActorBranch(actor, id.data);
  if (allowed === null) return { ok: false, error: "Kikao hakipatikani." };
  if (!allowed) return { ok: false, error: NOT_YOUR_BRANCH };

  const [row] = await db
    .update(meetings)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(and(eq(meetings.id, id.data), eq(meetings.status, "SCHEDULED")))
    .returning({ title: meetings.title });
  if (!row) return { ok: false, error: "Kikao hakipatikani au kimeshaghairiwa." };

  await writeAuditLog({
    actorId: actor.userId,
    action: "MEETING_CANCEL",
    entity: "meetings",
    entityId: id.data,
    metadata: { title: row.title },
  });
  revalidatePath("/meetings");
  revalidatePath(`/meetings/${id.data}`);
  return { ok: true, message: "Kikao kimeghairiwa." };
}

const MINUTES_MAX_BYTES = 10 * 1024 * 1024;
const MINUTES_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Record minutes (kumbukumbu) after a meeting has started: typed text and/or a file
 * (PDF, Word, photo). A new file replaces the old one; "removeFile" drops it.
 */
export async function saveMeetingMinutes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("MEETING_MANAGE");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Ombi si sahihi." };
  const text = z
    .string()
    .trim()
    .max(50_000, "Kumbukumbu zisizidi herufi 50,000")
    .safeParse(formData.get("minutesText") ?? "");
  if (!text.success) return { ok: false, error: text.error.issues[0]?.message ?? "Taarifa si sahihi" };
  const removeFile = formData.get("removeFile") === "on";

  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.id, id.data),
    columns: { title: true, status: true, startsAt: true, minutesFileUrl: true, branchId: true },
  });
  if (!meeting) return { ok: false, error: "Kikao hakipatikani." };
  if (!canManageBranch(await getManageBranchLimit(actor), meeting.branchId)) return { ok: false, error: NOT_YOUR_BRANCH };
  if (meeting.status === "CANCELLED") return { ok: false, error: "Kikao kimeghairiwa." };
  if (meeting.startsAt.getTime() > Date.now()) return { ok: false, error: "Kikao bado hakijaanza." };

  const file = formData.get("file");
  const hasNewFile = file instanceof File && file.size > 0;
  let fileUrl: string | null | undefined; // undefined = keep current
  let fileName: string | null | undefined;
  if (hasNewFile) {
    if (!MINUTES_TYPES.has(file.type)) return { ok: false, error: "Pakia PDF, Word au picha (JPG, PNG, WEBP) pekee." };
    if (file.size > MINUTES_MAX_BYTES) return { ok: false, error: "Faili lisizidi MB 10." };
    fileUrl = await uploadFile(Buffer.from(await file.arrayBuffer()), file.name, file.type, `meeting-minutes/${id.data}`);
    if (!fileUrl) return { ok: false, error: "Imeshindikana kupakia faili. Jaribu tena." };
    fileName = file.name.slice(0, 255);
  } else if (removeFile) {
    fileUrl = null;
    fileName = null;
  }

  const finalHasFile = fileUrl !== undefined ? fileUrl !== null : Boolean(meeting.minutesFileUrl);
  if (!text.data && !finalHasFile) return { ok: false, error: "Andika kumbukumbu au pakia faili." };

  await db
    .update(meetings)
    .set({
      minutesText: text.data || null,
      ...(fileUrl !== undefined ? { minutesFileUrl: fileUrl, minutesFileName: fileName } : {}),
      minutesUpdatedAt: new Date(),
      minutesUpdatedById: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, id.data));

  // Old file replaced or removed: drop it from storage.
  if (fileUrl !== undefined && meeting.minutesFileUrl) await deleteFile(meeting.minutesFileUrl);

  await writeAuditLog({
    actorId: actor.userId,
    action: "MEETING_MINUTES_SAVE",
    entity: "meetings",
    entityId: id.data,
    metadata: { title: meeting.title, hasText: Boolean(text.data), hasFile: finalHasFile },
  });
  revalidatePath(`/meetings/${id.data}`);
  return { ok: true, message: "Kumbukumbu zimehifadhiwa." };
}

/** Short-lived download link for a meeting's minutes file (anyone who can see the meeting). */
export async function getMeetingMinutesUrl(
  meetingId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Ingia kwanza." };
  if (!z.string().uuid().safeParse(meetingId).success) return { ok: false, error: "Ombi si sahihi." };
  const row = await getMeetingMinutesFile(await getMeetingScope(user), meetingId);
  if (!row?.fileUrl) return { ok: false, error: "Faili halipatikani." };
  const url = await getSignedDownloadUrl(row.fileUrl, 600);
  if (!url) return { ok: false, error: "Imeshindikana kupata kiungo. Jaribu tena." };
  return { ok: true, url };
}
