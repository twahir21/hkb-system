"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businessExpenses,
  businessSales,
  businessStock,
  businesses,
  guardCredits,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  recordExpenseSchema,
  recordSaleSchema,
  restockSchema,
} from "@/features/office/validators/office.schema";
import type { ActionState } from "@/features/office/actions/credit.actions";

const revalidateBusinessPaths = () => {
  revalidatePath("/office/business");
  revalidatePath("/office/business/history");
  revalidatePath("/dashboard");
};

/** Add stock to a business (records a RESTOCK expense at the same time). */
export async function restockBusiness(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("BUSINESS_MANAGE");

  const parsed = restockSchema.safeParse({
    businessId: formData.get("businessId") ?? undefined,
    date: formData.get("date") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    unitCost: formData.get("unitCost") ?? undefined,
    description: formData.get("description") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const amount = Math.round(v.quantity * v.unitCost * 100) / 100;

  await db
    .insert(businessStock)
    .values({ businessId: v.businessId, quantity: String(v.quantity) })
    .onConflictDoUpdate({
      target: businessStock.businessId,
      set: {
        quantity: sql`${businessStock.quantity} + ${String(v.quantity)}`,
        updatedAt: new Date(),
      },
    });

  const [expense] = await db
    .insert(businessExpenses)
    .values({
      businessId: v.businessId,
      date: v.date,
      category: "RESTOCK",
      description: v.description,
      amount: String(amount),
      quantity: String(v.quantity),
      recordedBy: user.userId,
    })
    .returning({ id: businessExpenses.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "BUSINESS_RESTOCK",
    entity: "business_expenses",
    entityId: expense.id,
    metadata: { businessId: v.businessId, quantity: v.quantity, unitCost: v.unitCost, amount },
  });

  revalidateBusinessPaths();
  return { ok: true, message: `Restocked ${v.quantity} units (expense ${amount.toLocaleString()} TZS).` };
}

/**
 * Record a sale. CREDIT_GUARD sales decrement stock and automatically create
 * the matching guard debt, which the bursar deducts at month end.
 */
export async function recordSale(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("BUSINESS_MANAGE");

  const parsed = recordSaleSchema.safeParse({
    businessId: formData.get("businessId") ?? undefined,
    date: formData.get("date") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    unitPrice: formData.get("unitPrice") ?? undefined,
    saleType: formData.get("saleType") ?? undefined,
    guardId: formData.get("guardId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const total = Math.round(v.quantity * v.unitPrice * 100) / 100;

  // Atomic conditional decrement — fails when stock is insufficient.
  const stockRows = await db
    .update(businessStock)
    .set({ quantity: sql`${businessStock.quantity} - ${String(v.quantity)}`, updatedAt: new Date() })
    .where(
      sql`${businessStock.businessId} = ${v.businessId} AND ${businessStock.quantity} >= ${String(v.quantity)}`
    )
    .returning({ id: businessStock.id });

  if (stockRows.length === 0) {
    return {
      ok: false,
      error: "Not enough stock on hand for this business — restock first.",
    };
  }

  let creditId: string | null = null;
  if (v.saleType === "CREDIT_GUARD") {
    const [business] = await db
      .select({ name: businesses.name, unit: businesses.unit })
      .from(businesses)
      .where(eq(businesses.id, v.businessId))
      .limit(1);

    const bName = (business?.name ?? "").toLowerCase();
    const creditType = bName.includes("fish") || bName.includes("samaki")
      ? "FISH"
      : bName.includes("maize") ||
          bName.includes("flour") ||
          bName.includes("unga") ||
          bName.includes("sembe") ||
          bName.includes("dona")
        ? "MAIZE_FLOUR"
        : "OTHER";

    const [credit] = await db
      .insert(guardCredits)
      .values({
        guardId: v.guardId!,
        type: creditType,
        description: `${v.quantity} ${business?.unit ?? "unit"} ${business?.name ?? "goods"} — bought on credit`,
        quantity: String(v.quantity),
        amount: String(total),
        date: v.date,
        businessId: v.businessId,
        recordedBy: user.userId,
      })
      .returning({ id: guardCredits.id });
    creditId = credit.id;
  }

  const [sale] = await db
    .insert(businessSales)
    .values({
      businessId: v.businessId,
      date: v.date,
      quantity: String(v.quantity),
      unitPrice: String(v.unitPrice),
      totalAmount: String(total),
      saleType: v.saleType,
      guardCreditId: creditId,
      recordedBy: user.userId,
    })
    .returning({ id: businessSales.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "BUSINESS_SALE",
    entity: "business_sales",
    entityId: sale.id,
    metadata: {
      businessId: v.businessId,
      quantity: v.quantity,
      unitPrice: v.unitPrice,
      total,
      saleType: v.saleType,
      guardId: v.guardId ?? null,
      guardCreditId: creditId,
    },
  });

  revalidateBusinessPaths();
  revalidatePath("/office/credit");
  revalidatePath("/my-credits");
  return {
    ok: true,
    message:
      v.saleType === "CREDIT_GUARD"
        ? `Sale recorded on credit (${total.toLocaleString()} TZS) and added to the guard's debts.`
        : `Cash sale recorded (${total.toLocaleString()} TZS).`,
  };
}


/** Record a general expense (transport, other — restocks use restockBusiness). */
export async function recordExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission("BUSINESS_MANAGE");

  const parsed = recordExpenseSchema.safeParse({
    businessId: formData.get("businessId") ?? undefined,
    date: formData.get("date") ?? undefined,
    category: formData.get("category") ?? undefined,
    description: formData.get("description") ?? undefined,
    amount: formData.get("amount") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const [expense] = await db
    .insert(businessExpenses)
    .values({
      businessId: v.businessId,
      date: v.date,
      category: v.category === "RESTOCK" ? "OTHER" : v.category,
      description: v.description,
      amount: String(v.amount),
      recordedBy: user.userId,
    })
    .returning({ id: businessExpenses.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "BUSINESS_EXPENSE",
    entity: "business_expenses",
    entityId: expense.id,
    metadata: { businessId: v.businessId, category: v.category, amount: v.amount },
  });

  revalidateBusinessPaths();
  return { ok: true, message: `Expense recorded (${v.amount.toLocaleString()} TZS).` };
}

