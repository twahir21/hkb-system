"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardCredits } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  recordCreditSchema,
  settleCreditsSchema,
  writeOffCreditSchema,
} from "@/features/office/validators/office.schema";

export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const revalidateCreditPaths = () => {
  revalidatePath("/office/credit");
  revalidatePath("/office/credit/settlement");
  revalidatePath("/my-credits");
  revalidatePath("/dashboard");
};

/** Record a new debt for a guard (fish, maize flour, medical treatment, other). */
export async function recordCredit(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("CREDIT_RECORD");

  const parsed = recordCreditSchema.safeParse({
    guardId: formData.get("guardId") ?? undefined,
    type: formData.get("type") ?? undefined,
    description: formData.get("description") ?? undefined,
    quantity: formData.get("quantity") || undefined,
    amount: formData.get("amount") ?? undefined,
    date: formData.get("date") ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const [row] = await db
    .insert(guardCredits)
    .values({
      guardId: v.guardId,
      type: v.type,
      description: v.description,
      quantity: v.quantity !== undefined ? String(v.quantity) : null,
      amount: String(v.amount),
      date: v.date,
      notes: v.notes ?? null,
      recordedBy: user.userId,
    })
    .returning({ id: guardCredits.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "CREDIT_RECORDED",
    entity: "guard_credits",
    entityId: row.id,
    metadata: { guardId: v.guardId, type: v.type, amount: v.amount, date: v.date },
  });

  revalidateCreditPaths();
  return { ok: true, message: "Debt recorded for the guard." };
}

/**
 * Bursar month-end settlement: mark the given outstanding debts as deducted
 * from the guards' salaries for the given month.
 */
export async function settleCredits(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("CREDIT_SETTLE");

  const creditIds = formData
    .getAll("creditIds")
    .map((v) => String(v))
    .filter(Boolean);
  const parsed = settleCreditsSchema.safeParse({
    creditIds,
    deductionMonth: formData.get("deductionMonth") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const rows = await db
    .update(guardCredits)
    .set({
      status: "DEDUCTED",
      deductionMonth: v.deductionMonth,
      deductedBy: user.userId,
      deductedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(guardCredits.id, v.creditIds),
        eq(guardCredits.status, "OUTSTANDING")
      )
    )
    .returning({ id: guardCredits.id, amount: guardCredits.amount });

  if (rows.length === 0) {
    return { ok: false, error: "No outstanding debts were found for the selection." };
  }

  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  await writeAuditLog({
    actorId: user.userId,
    action: "CREDIT_DEDUCTED",
    entity: "guard_credits",
    metadata: {
      deductionMonth: v.deductionMonth,
      entries: rows.length,
      total,
      creditIds: rows.map((r) => r.id),
    },
  });

  revalidateCreditPaths();
  return {
    ok: true,
    message: `${rows.length} entr${rows.length === 1 ? "y" : "ies"} deducted (total ${total.toLocaleString()} TZS) for ${v.deductionMonth}.`,
  };
}

/** Cancel a debt (e.g. the office agreed to cover it) — requires a reason. */
export async function writeOffCredit(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("CREDIT_SETTLE");

  const parsed = writeOffCreditSchema.safeParse({
    creditId: formData.get("creditId") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const rows = await db
    .update(guardCredits)
    .set({ status: "WRITTEN_OFF", notes: v.notes, updatedAt: new Date() })
    .where(and(eq(guardCredits.id, v.creditId), eq(guardCredits.status, "OUTSTANDING")))
    .returning({ id: guardCredits.id });

  if (rows.length === 0) {
    return { ok: false, error: "Debt not found or already settled." };
  }

  await writeAuditLog({
    actorId: user.userId,
    action: "CREDIT_WRITTEN_OFF",
    entity: "guard_credits",
    entityId: v.creditId,
    metadata: { notes: v.notes },
  });

  revalidateCreditPaths();
  return { ok: true, message: "Debt written off." };
}
