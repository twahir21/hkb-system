"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { branches, meetingInvitees, meetings, users } from "@/lib/db/schema";
import { GUARD_ROLES } from "@/lib/auth/roles";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** datetime-local value ("YYYY-MM-DDTHH:mm") entered in Tanzania time (EAT, UTC+3). */
const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const toEat = (v: string) => new Date(`${v}:00+03:00`);

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
    .where(and(inArray(users.id, v.invitees), notInArray(users.role, [...GUARD_ROLES])));
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
