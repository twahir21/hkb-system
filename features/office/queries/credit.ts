import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { guardCredits, guardProfiles, users } from "@/lib/db/schema";
import type { CreditStatus } from "@/lib/db/schema";

const recorder = alias(users, "recorder");
const deductor = alias(users, "deductor");

export type CreditRow = {
  id: string;
  guardId: string;
  guardName: string;
  employeeId: string;
  type: (typeof guardCredits.$inferSelect)["type"];
  description: string;
  quantity: number | null;
  amount: number;
  date: string;
  status: CreditStatus;
  deductionMonth: string | null;
  deductedByName: string | null;
  deductedAt: Date | null;
  notes: string | null;
  documentUrl: string | null;
  recordedByName: string | null;
  createdAt: Date;
};

const baseSelect = {
  id: guardCredits.id,
  guardId: guardCredits.guardId,
  guardName: users.fullName,
  employeeId: guardProfiles.employeeId,
  type: guardCredits.type,
  description: guardCredits.description,
  quantity: guardCredits.quantity,
  amount: guardCredits.amount,
  date: guardCredits.date,
  status: guardCredits.status,
  deductionMonth: guardCredits.deductionMonth,
  deductedByName: deductor.fullName,
  deductedAt: guardCredits.deductedAt,
  notes: guardCredits.notes,
  documentUrl: guardCredits.documentUrl,
  recordedByName: recorder.fullName,
  createdAt: guardCredits.createdAt,
};

function baseQuery() {
  return db
    .select(baseSelect)
    .from(guardCredits)
    .innerJoin(guardProfiles, eq(guardCredits.guardId, guardProfiles.id))
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(recorder, eq(guardCredits.recordedBy, recorder.id))
    .leftJoin(deductor, eq(guardCredits.deductedBy, deductor.id))
    .$dynamic();
}

function normalize(rows: Awaited<ReturnType<ReturnType<typeof baseQuery>["execute"]>>): CreditRow[] {
  return rows.map((r) => ({
    ...r,
    quantity: r.quantity === null ? null : Number(r.quantity),
    amount: Number(r.amount),
  }));
}

export async function listCredits(filters?: {
  status?: CreditStatus;
  guardId?: string;
  deductionMonth?: string;
  limit?: number;
}): Promise<CreditRow[]> {
  const query = baseQuery();
  if (filters?.status) query.where(eq(guardCredits.status, filters.status));
  if (filters?.guardId) query.where(eq(guardCredits.guardId, filters.guardId));
  if (filters?.deductionMonth)
    query.where(eq(guardCredits.deductionMonth, filters.deductionMonth));
  query.orderBy(desc(guardCredits.date), desc(guardCredits.createdAt));
  if (filters?.limit) query.limit(filters.limit);
  return normalize(await query);
}

export type GuardOption = {
  guardId: string;
  employeeId: string;
  guardName: string;
  outstandingAmount: number;
  outstandingCount: number;
};

/** Guards with a live total of what they currently owe the office. */
export async function listGuardOptions(): Promise<GuardOption[]> {
  const rows = await db
    .select({
      guardId: guardProfiles.id,
      employeeId: guardProfiles.employeeId,
      guardName: users.fullName,
      outstandingAmount:
        sql<number>`COALESCE(SUM(${guardCredits.amount}) FILTER (WHERE ${guardCredits.status} = 'OUTSTANDING'), 0)`.as(
          "outstanding_amount",
        ),
      outstandingCount:
        sql<number>`COUNT(*) FILTER (WHERE ${guardCredits.status} = 'OUTSTANDING')`.as(
          "outstanding_count",
        ),
    })
    .from(guardProfiles)
    .innerJoin(users, eq(guardProfiles.userId, users.id))
    .leftJoin(guardCredits, eq(guardCredits.guardId, guardProfiles.id))
    .where(eq(users.role, "GUARD"))
    .groupBy(guardProfiles.id, guardProfiles.employeeId, users.fullName)
    .orderBy(users.fullName);

  return rows.map((r) => ({
    ...r,
    outstandingAmount: Number(r.outstandingAmount),
    outstandingCount: Number(r.outstandingCount),
  }));
}

export type GuardOutstanding = {
  guardId: string;
  employeeId: string;
  guardName: string;
  totalAmount: number;
  entries: CreditRow[];
};

/** All OUTSTANDING debts grouped per guard — the bursar's deduction sheet. */
export async function getOutstandingByGuard(): Promise<GuardOutstanding[]> {
  const rows = await listCredits({ status: "OUTSTANDING" });
  const byGuard = new Map<string, GuardOutstanding>();
  for (const row of rows) {
    let group = byGuard.get(row.guardId);
    if (!group) {
      group = {
        guardId: row.guardId,
        employeeId: row.employeeId,
        guardName: row.guardName,
        totalAmount: 0,
        entries: [],
      };
      byGuard.set(row.guardId, group);
    }
    group.entries.push(row);
    group.totalAmount += row.amount;
  }
  return [...byGuard.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getGuardTotalOutstanding(guardId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${guardCredits.amount}), 0)`.as("total") })
    .from(guardCredits)
    .where(and(eq(guardCredits.guardId, guardId), eq(guardCredits.status, "OUTSTANDING")));
  return Number(row?.total ?? 0);
}

export type DeductionMonthRow = {
  deductionMonth: string;
  guards: number;
  entries: number;
  totalAmount: number;
};

/** History of past salary-deduction runs. */
export async function listDeductionMonths(): Promise<DeductionMonthRow[]> {
  const rows = await db
    .select({
      deductionMonth: guardCredits.deductionMonth,
      guards: sql<number>`COUNT(DISTINCT ${guardCredits.guardId})`.as("guards"),
      entries: sql<number>`COUNT(*)`.as("entries"),
      totalAmount: sql<number>`COALESCE(SUM(${guardCredits.amount}), 0)`.as("total_amount"),
    })
    .from(guardCredits)
    .where(eq(guardCredits.status, "DEDUCTED"))
    .groupBy(guardCredits.deductionMonth)
    .orderBy(desc(guardCredits.deductionMonth));

  return rows.map((r) => ({
    deductionMonth: r.deductionMonth ?? "",
    guards: Number(r.guards),
    entries: Number(r.entries),
    totalAmount: Number(r.totalAmount),
  }));
}
