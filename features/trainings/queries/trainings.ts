import "server-only";

import { and, asc, desc, eq, gte, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  branches,
  trainingAttendees,
  trainings,
  users,
  type Role,
  type TrainingAttendance,
  type TrainingStatus,
} from "@/lib/db/schema";
import { hasPermission } from "@/lib/auth/rbac";
import { getUserBranch } from "@/features/branches/queries/branches";

/** HQ office sees every training; everyone else sees company-wide ones plus their own branch's. */
export type TrainingScope = { kind: "all" } | { kind: "branch"; branchId: string | null };

export async function getTrainingScope(user: { userId: string; role: Role }): Promise<TrainingScope> {
  if (hasPermission(user.role, "TRAINING_VIEW_ALL")) return { kind: "all" };
  const b = await getUserBranch(user.userId);
  return { kind: "branch", branchId: b?.id ?? null };
}

function scopeWhere(scope: TrainingScope): SQL | undefined {
  if (scope.kind === "all") return undefined;
  return scope.branchId ? or(isNull(trainings.branchId), eq(trainings.branchId, scope.branchId)) : isNull(trainings.branchId);
}

export type TrainingRow = {
  id: string;
  title: string;
  trainer: string;
  startDate: string;
  endDate: string;
  venue: string;
  branchId: string | null;
  branchName: string | null;
  description: string | null;
  status: TrainingStatus;
  organiserName: string | null;
  attendeeCount: number;
};

const organiser = alias(users, "organiser");

/** Upcoming (ends today or later) or past trainings, inside the scope. `today` is YYYY-MM-DD (EAT). */
export async function listTrainings(scope: TrainingScope, when: "upcoming" | "past", today: string): Promise<TrainingRow[]> {
  return db
    .select({
      id: trainings.id,
      title: trainings.title,
      trainer: trainings.trainer,
      startDate: trainings.startDate,
      endDate: trainings.endDate,
      venue: trainings.venue,
      branchId: trainings.branchId,
      branchName: branches.name,
      description: trainings.description,
      status: trainings.status,
      organiserName: organiser.fullName,
      attendeeCount: sql<number>`(SELECT count(*) FROM ${trainingAttendees} WHERE ${trainingAttendees.trainingId} = ${trainings.id})`,
    })
    .from(trainings)
    .leftJoin(branches, eq(trainings.branchId, branches.id))
    .leftJoin(organiser, eq(trainings.createdById, organiser.id))
    .where(and(scopeWhere(scope), when === "upcoming" ? gte(trainings.endDate, today) : lt(trainings.endDate, today)))
    .orderBy(when === "upcoming" ? asc(trainings.startDate) : desc(trainings.startDate))
    .limit(200)
    .then((rows) => rows.map((r) => ({ ...r, attendeeCount: Number(r.attendeeCount) })));
}

export type TrainingDetail = Omit<TrainingRow, "attendeeCount">;

export async function getTraining(scope: TrainingScope, id: string): Promise<TrainingDetail | null> {
  const [row] = await db
    .select({
      id: trainings.id,
      title: trainings.title,
      trainer: trainings.trainer,
      startDate: trainings.startDate,
      endDate: trainings.endDate,
      venue: trainings.venue,
      branchId: trainings.branchId,
      branchName: branches.name,
      description: trainings.description,
      status: trainings.status,
      organiserName: organiser.fullName,
    })
    .from(trainings)
    .leftJoin(branches, eq(trainings.branchId, branches.id))
    .leftJoin(organiser, eq(trainings.createdById, organiser.id))
    .where(and(eq(trainings.id, id), scopeWhere(scope)))
    .limit(1);
  return row ?? null;
}

export type TrainingAttendeeRow = {
  userId: string;
  fullName: string;
  role: Role;
  branchName: string | null;
  attendance: TrainingAttendance;
  completed: boolean;
  completedOn: string | null;
  certificateNo: string | null;
  certificateFileName: string | null; // set when a certificate was uploaded (URL stays server-side)
};

/** Attendees of a training. Pass `userId` to get only that person's row. */
export async function listTrainingAttendees(trainingId: string, userId?: string): Promise<TrainingAttendeeRow[]> {
  const attendeeBranch = alias(branches, "attendee_branch");
  return db
    .select({
      userId: users.id,
      fullName: users.fullName,
      role: users.role,
      branchName: attendeeBranch.name,
      attendance: trainingAttendees.attendance,
      completed: trainingAttendees.completed,
      completedOn: trainingAttendees.completedOn,
      certificateNo: trainingAttendees.certificateNo,
      certificateFileName: trainingAttendees.certificateFileName,
    })
    .from(trainingAttendees)
    .innerJoin(users, eq(trainingAttendees.userId, users.id))
    .leftJoin(attendeeBranch, eq(users.branchId, attendeeBranch.id))
    .where(and(eq(trainingAttendees.trainingId, trainingId), userId ? eq(trainingAttendees.userId, userId) : undefined))
    .orderBy(asc(users.fullName));
}

export type EnrollableUser = { id: string; fullName: string; role: Role; branchId: string | null };

/** Staff and guards who can be enrolled: the training's branch, or everyone for company-wide trainings. */
export async function listEnrollableUsers(branchId: string | null): Promise<EnrollableUser[]> {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role, branchId: users.branchId })
    .from(users)
    .where(branchId ? eq(users.branchId, branchId) : undefined)
    .orderBy(asc(users.fullName));
}

export type EmployeeTrainingRow = {
  trainingId: string;
  title: string;
  trainer: string;
  startDate: string;
  endDate: string;
  status: TrainingStatus;
  attendance: TrainingAttendance;
  completed: boolean;
  completedOn: string | null;
  certificateNo: string | null;
  certificateFileName: string | null;
};

/** Training history of one employee (newest first). */
export async function listEmployeeTrainings(userId: string): Promise<EmployeeTrainingRow[]> {
  return db
    .select({
      trainingId: trainings.id,
      title: trainings.title,
      trainer: trainings.trainer,
      startDate: trainings.startDate,
      endDate: trainings.endDate,
      status: trainings.status,
      attendance: trainingAttendees.attendance,
      completed: trainingAttendees.completed,
      completedOn: trainingAttendees.completedOn,
      certificateNo: trainingAttendees.certificateNo,
      certificateFileName: trainingAttendees.certificateFileName,
    })
    .from(trainingAttendees)
    .innerJoin(trainings, eq(trainingAttendees.trainingId, trainings.id))
    .where(eq(trainingAttendees.userId, userId))
    .orderBy(desc(trainings.startDate));
}

export type TrainingCalendarEntry = Pick<TrainingRow, "id" | "title" | "trainer" | "startDate" | "endDate" | "venue" | "status">;

/** Trainings overlapping a month (first/last YYYY-MM-DD), inside the scope. */
export async function listTrainingsForMonth(
  scope: TrainingScope,
  first: string,
  last: string
): Promise<TrainingCalendarEntry[]> {
  return db
    .select({
      id: trainings.id,
      title: trainings.title,
      trainer: trainings.trainer,
      startDate: trainings.startDate,
      endDate: trainings.endDate,
      venue: trainings.venue,
      status: trainings.status,
    })
    .from(trainings)
    .where(and(scopeWhere(scope), lte(trainings.startDate, last), gte(trainings.endDate, first)))
    .orderBy(asc(trainings.startDate));
}
