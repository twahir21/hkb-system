import "server-only";

import { and, asc, desc, eq, exists, gte, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { branches, meetingInvitees, meetings, users, type MeetingStatus, type Role } from "@/lib/db/schema";
import { GUARD_ROLES } from "@/lib/auth/roles";
import { hasPermission } from "@/lib/auth/rbac";
import { getUserBranch } from "@/features/branches/queries/branches";

export type MeetingScope =
  | { kind: "all" }
  | { kind: "invited"; userId: string }
  // Office Assistant: own branch's meetings plus any they organise or are invited to.
  | { kind: "branch"; userId: string; branchId: string };

export async function getMeetingScope(user: { userId: string; role: Role }): Promise<MeetingScope> {
  if (hasPermission(user.role, "MEETING_VIEW_ALL")) return { kind: "all" };
  if (hasPermission(user.role, "MEETING_VIEW_BRANCH")) {
    const b = await getUserBranch(user.userId);
    if (b) return { kind: "branch", userId: user.userId, branchId: b.id };
  }
  return { kind: "invited", userId: user.userId };
}

/** Invited users and the organiser see a meeting; HQ office sees all; Office Assistant also its branch's. */
function scopeWhere(scope: MeetingScope): SQL | undefined {
  if (scope.kind === "all") return undefined;
  return or(
    scope.kind === "branch" ? eq(meetings.branchId, scope.branchId) : undefined,
    eq(meetings.createdById, scope.userId),
    exists(
      db
        .select({ one: sql`1` })
        .from(meetingInvitees)
        .where(and(eq(meetingInvitees.meetingId, meetings.id), eq(meetingInvitees.userId, scope.userId)))
    )
  );
}

export type MeetingRow = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  venue: string | null;
  onlineLink: string | null;
  branchName: string | null;
  status: MeetingStatus;
  organiserName: string | null;
  inviteeCount: number;
};

const organiser = alias(users, "organiser");
const minutesEditor = alias(users, "minutes_editor");

/** Upcoming (ends today or later) or past meetings, inside the scope. */
export async function listMeetings(scope: MeetingScope, when: "upcoming" | "past"): Promise<MeetingRow[]> {
  // Upcoming until it ends (no end time = assume 2 hours).
  const endsAt = sql`COALESCE(${meetings.endsAt}, ${meetings.startsAt} + interval '2 hours')`;
  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      startsAt: meetings.startsAt,
      endsAt: meetings.endsAt,
      venue: meetings.venue,
      onlineLink: meetings.onlineLink,
      branchName: branches.name,
      status: meetings.status,
      organiserName: organiser.fullName,
      inviteeCount: sql<number>`(SELECT count(*) FROM ${meetingInvitees} WHERE ${meetingInvitees.meetingId} = ${meetings.id})`,
    })
    .from(meetings)
    .leftJoin(branches, eq(meetings.branchId, branches.id))
    .leftJoin(organiser, eq(meetings.createdById, organiser.id))
    .where(
      and(
        scopeWhere(scope),
        when === "upcoming" ? sql`${endsAt} >= now()` : sql`${endsAt} < now()`
      )
    )
    .orderBy(when === "upcoming" ? asc(meetings.startsAt) : desc(meetings.startsAt))
    .limit(200);
  return rows.map((r) => ({ ...r, inviteeCount: Number(r.inviteeCount) }));
}

export type MeetingDetail = Omit<MeetingRow, "inviteeCount"> & {
  agenda: string;
  branchId: string | null;
  createdById: string | null;
  minutesText: string | null;
  minutesFileName: string | null; // set when a minutes file was uploaded (URL stays server-side)
  minutesUpdatedAt: Date | null;
  minutesUpdatedByName: string | null;
  invitees: { userId: string; fullName: string; role: Role; branchName: string | null }[];
};

export async function getMeeting(scope: MeetingScope, id: string): Promise<MeetingDetail | null> {
  const [row] = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      startsAt: meetings.startsAt,
      endsAt: meetings.endsAt,
      venue: meetings.venue,
      onlineLink: meetings.onlineLink,
      branchId: meetings.branchId,
      branchName: branches.name,
      status: meetings.status,
      agenda: meetings.agenda,
      createdById: meetings.createdById,
      organiserName: organiser.fullName,
      minutesText: meetings.minutesText,
      minutesFileName: meetings.minutesFileName,
      minutesUpdatedAt: meetings.minutesUpdatedAt,
      minutesUpdatedByName: minutesEditor.fullName,
    })
    .from(meetings)
    .leftJoin(branches, eq(meetings.branchId, branches.id))
    .leftJoin(organiser, eq(meetings.createdById, organiser.id))
    .leftJoin(minutesEditor, eq(meetings.minutesUpdatedById, minutesEditor.id))
    .where(and(eq(meetings.id, id), scopeWhere(scope)))
    .limit(1);
  if (!row) return null;

  const inviteeBranch = alias(branches, "invitee_branch");
  const invitees = await db
    .select({ userId: users.id, fullName: users.fullName, role: users.role, branchName: inviteeBranch.name })
    .from(meetingInvitees)
    .innerJoin(users, eq(meetingInvitees.userId, users.id))
    .leftJoin(inviteeBranch, eq(users.branchId, inviteeBranch.id))
    .where(eq(meetingInvitees.meetingId, id))
    .orderBy(asc(users.fullName));

  return { ...row, invitees };
}

export type InvitableStaff = { id: string; fullName: string; role: Role; branchId: string | null };

/**
 * Office / field staff who can be invited (guards excluded — too many, rarely invited).
 * `branchId` limits the list to one branch (Office Assistant).
 */
export async function listInvitableStaff(branchId?: string): Promise<InvitableStaff[]> {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role, branchId: users.branchId })
    .from(users)
    .where(and(notInArray(users.role, [...GUARD_ROLES]), branchId ? eq(users.branchId, branchId) : undefined))
    .orderBy(asc(users.fullName));
}

export type MeetingCalendarEntry = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  status: MeetingStatus;
};

/** Meetings starting inside a month (YYYY-MM, EAT days), inside the scope. */
export async function listMeetingsForMonth(scope: MeetingScope, month: string): Promise<MeetingCalendarEntry[]> {
  const [y, m] = month.split("-").map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  const from = new Date(`${month}-01T00:00:00+03:00`);
  const to = new Date(`${next}-01T00:00:00+03:00`);
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      startsAt: meetings.startsAt,
      endsAt: meetings.endsAt,
      status: meetings.status,
    })
    .from(meetings)
    .where(and(scopeWhere(scope), gte(meetings.startsAt, from), lt(meetings.startsAt, to)))
    .orderBy(asc(meetings.startsAt));
}

/** Stored minutes-file URL of a meeting inside the scope (server-only; never sent to the client). */
export async function getMeetingMinutesFile(
  scope: MeetingScope,
  id: string
): Promise<{ title: string; fileUrl: string | null } | null> {
  const [row] = await db
    .select({ title: meetings.title, fileUrl: meetings.minutesFileUrl })
    .from(meetings)
    .where(and(eq(meetings.id, id), scopeWhere(scope)))
    .limit(1);
  return row ?? null;
}
