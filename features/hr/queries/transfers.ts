import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { guardProfiles, transferRequests, users } from "@/lib/db/schema";

const fromUser = alias(users, "from_supervisor");
const toUser = alias(users, "to_supervisor");
const reqUser = alias(users, "requested_by");
const approver = alias(users, "approved_by");

export type TransferRow = {
  id: string;
  status: (typeof transferRequests.$inferSelect)["status"];
  reason: string;
  reviewerNotes: string | null;
  createdAt: Date;
  guardName: string;
  employeeId: string;
  fromSupervisor: string;
  toSupervisor: string;
  requestedBy: string;
  approvedByName: string | null;
};

export async function listTransfers(
  status?: (typeof transferRequests.$inferSelect)["status"]
) {
  const rows = await db
    .select({
      transfer: transferRequests,
      guardName: users.fullName,
      employeeId: guardProfiles.employeeId,
      fromSupervisor: sql<string>`${fromUser.fullName}`.as("from_supervisor"),
      toSupervisor: sql<string>`${toUser.fullName}`.as("to_supervisor"),
      requestedBy: sql<string>`${reqUser.fullName}`.as("requested_by"),
      approvedByName: sql<string | null>`${approver.fullName}`.as("approved_by"),
    })
    .from(transferRequests)
    .innerJoin(guardProfiles, eq(transferRequests.guardId, guardProfiles.id))
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(fromUser, eq(transferRequests.fromSupervisorId, fromUser.id))
    .leftJoin(toUser, eq(transferRequests.toSupervisorId, toUser.id))
    .leftJoin(reqUser, eq(transferRequests.requestedBy, reqUser.id))
    .leftJoin(approver, eq(transferRequests.approvedBy, approver.id))
    .where(status ? eq(transferRequests.status, status) : undefined)
    .orderBy(desc(transferRequests.createdAt));

  return rows.map((r) => ({
    id: r.transfer.id,
    status: r.transfer.status,
    reason: r.transfer.reason,
    reviewerNotes: r.transfer.reviewerNotes,
    createdAt: r.transfer.createdAt,
    guardName: r.guardName,
    employeeId: r.employeeId,
    fromSupervisor: r.fromSupervisor ?? "",
    toSupervisor: r.toSupervisor ?? "",
    requestedBy: r.requestedBy ?? "",
    approvedByName: r.approvedByName ?? null,
  }));
}