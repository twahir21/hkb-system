import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  businesses,
  businessExpenses,
  businessSales,
  businessStock,
  guardCredits,
  guardProfiles,
  users,
} from "@/lib/db/schema";

const recorder = alias(users, "sales_recorder");
const creditGuard = alias(users, "credit_guard");

export async function listBusinesses() {
  return db.select().from(businesses).orderBy(businesses.name);
}

export type BusinessWithStock = {
  id: string;
  name: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  isActive: boolean;
  stock: number;
};

export async function listBusinessesWithStock(): Promise<BusinessWithStock[]> {
  const rows = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      unit: businesses.unit,
      buyPrice: businesses.buyPrice,
      sellPrice: businesses.sellPrice,
      isActive: businesses.isActive,
      stock: sql<number>`COALESCE(${businessStock.quantity}, 0)`,
    })
    .from(businesses)
    .leftJoin(businessStock, eq(businessStock.businessId, businesses.id))
    .orderBy(businesses.name);

  return rows.map((r) => ({
    ...r,
    buyPrice: Number(r.buyPrice),
    sellPrice: Number(r.sellPrice),
    stock: Number(r.stock),
  }));
}

function monthRange(year: number, month: number) {
  // month is 1-based
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export type BusinessMonthlySummary = {
  businessId: string;
  name: string;
  unit: string;
  stock: number;
  unitsSold: number;
  revenue: number;
  cashRevenue: number;
  creditRevenue: number;
  expenses: number;
  restockSpend: number;
  profit: number;
};

/** Per-business profit & loss for a calendar month. */
export async function getMonthlySummaries(
  year: number,
  month: number
): Promise<BusinessMonthlySummary[]> {
  const { start, end } = monthRange(year, month);

  const salesAgg = db
    .select({
      businessId: businessSales.businessId,
      unitsSold: sql<number>`COALESCE(SUM(${businessSales.quantity}), 0)`.as("units_sold"),
      revenue: sql<number>`COALESCE(SUM(${businessSales.totalAmount}), 0)`.as("revenue"),
      cashRevenue:
        sql<number>`COALESCE(SUM(${businessSales.totalAmount}) FILTER (WHERE ${businessSales.saleType} = 'CASH'), 0)`.as("cash_revenue"),
      creditRevenue:
        sql<number>`COALESCE(SUM(${businessSales.totalAmount}) FILTER (WHERE ${businessSales.saleType} = 'CREDIT_GUARD'), 0)`.as("credit_revenue"),
    })
    .from(businessSales)
    .where(and(gte(businessSales.date, start), lte(businessSales.date, end)))
    .groupBy(businessSales.businessId)
    .as("sales_agg");

  const expenseAgg = db
    .select({
      businessId: businessExpenses.businessId,
      expenses: sql<number>`COALESCE(SUM(${businessExpenses.amount}), 0)`.as("expenses"),
      restockSpend:
        sql<number>`COALESCE(SUM(${businessExpenses.amount}) FILTER (WHERE ${businessExpenses.category} = 'RESTOCK'), 0)`.as("restock_spend"),
    })
    .from(businessExpenses)
    .where(and(gte(businessExpenses.date, start), lte(businessExpenses.date, end)))
    .groupBy(businessExpenses.businessId)
    .as("expense_agg");

  const rows = await db
    .select({
      businessId: businesses.id,
      name: businesses.name,
      unit: businesses.unit,
      stock: sql<number>`COALESCE(${businessStock.quantity}, 0)`,
      unitsSold: sql<number>`COALESCE(${salesAgg.unitsSold}, 0)`,
      revenue: sql<number>`COALESCE(${salesAgg.revenue}, 0)`,
      cashRevenue: sql<number>`COALESCE(${salesAgg.cashRevenue}, 0)`,
      creditRevenue: sql<number>`COALESCE(${salesAgg.creditRevenue}, 0)`,
      expenses: sql<number>`COALESCE(${expenseAgg.expenses}, 0)`,
      restockSpend: sql<number>`COALESCE(${expenseAgg.restockSpend}, 0)`,
    })
    .from(businesses)
    .leftJoin(businessStock, eq(businessStock.businessId, businesses.id))
    .leftJoin(salesAgg, eq(salesAgg.businessId, businesses.id))
    .leftJoin(expenseAgg, eq(expenseAgg.businessId, businesses.id))
    .where(eq(businesses.isActive, true))
    .orderBy(businesses.name);

  return rows.map((r) => ({
    businessId: r.businessId,
    name: r.name,
    unit: r.unit,
    stock: Number(r.stock),
    unitsSold: Number(r.unitsSold),
    revenue: Number(r.revenue),
    cashRevenue: Number(r.cashRevenue),
    creditRevenue: Number(r.creditRevenue),
    expenses: Number(r.expenses),
    restockSpend: Number(r.restockSpend),
    profit: Number(r.revenue) - Number(r.expenses),
  }));
}


export type SaleRow = {
  id: string;
  businessId: string;
  businessName: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleType: (typeof businessSales.$inferSelect)["saleType"];
  guardName: string | null;
  recordedByName: string | null;
  createdAt: Date;
};

export async function listSales(filters?: {
  businessId?: string;
  year?: number;
  month?: number;
  limit?: number;
}): Promise<SaleRow[]> {
  const conditions = [];
  if (filters?.businessId) conditions.push(eq(businessSales.businessId, filters.businessId));
  if (filters?.year && filters?.month) {
    const { start, end } = monthRange(filters.year, filters.month);
    conditions.push(and(gte(businessSales.date, start), lte(businessSales.date, end))!);
  }

  // Credit-guard sales resolve their guard through the linked guard_credits row.
  const creditLink = alias(guardCredits, "credit_link");
  const creditProfile = alias(guardProfiles, "credit_profile");
  const rows = await db
    .select({
      id: businessSales.id,
      businessId: businessSales.businessId,
      businessName: businesses.name,
      date: businessSales.date,
      quantity: businessSales.quantity,
      unitPrice: businessSales.unitPrice,
      totalAmount: businessSales.totalAmount,
      saleType: businessSales.saleType,
      guardName: creditGuard.fullName,
      recordedByName: recorder.fullName,
      createdAt: businessSales.createdAt,
    })
    .from(businessSales)
    .innerJoin(businesses, eq(businessSales.businessId, businesses.id))
    .leftJoin(creditLink, eq(creditLink.id, businessSales.guardCreditId))
    .leftJoin(creditProfile, eq(creditProfile.id, creditLink.guardId))
    .leftJoin(creditGuard, eq(creditGuard.id, creditProfile.userId))
    .leftJoin(recorder, eq(businessSales.recordedBy, recorder.id))

    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(businessSales.date), desc(businessSales.createdAt))
    .limit(filters?.limit ?? 200);

  return rows.map((r) => ({
    ...r,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unitPrice),
    totalAmount: Number(r.totalAmount),
  }));
}

export type ExpenseRow = {
  id: string;
  businessId: string;
  businessName: string;
  date: string;
  category: (typeof businessExpenses.$inferSelect)["category"];
  description: string;
  amount: number;
  quantity: number | null;
  recordedByName: string | null;
  createdAt: Date;
};

export async function listExpenses(filters?: {
  businessId?: string;
  year?: number;
  month?: number;
  limit?: number;
}): Promise<ExpenseRow[]> {
  const conditions = [];
  if (filters?.businessId) conditions.push(eq(businessExpenses.businessId, filters.businessId));
  if (filters?.year && filters?.month) {
    const { start, end } = monthRange(filters.year, filters.month);
    conditions.push(and(gte(businessExpenses.date, start), lte(businessExpenses.date, end))!);
  }

  const rows = await db
    .select({
      id: businessExpenses.id,
      businessId: businessExpenses.businessId,
      businessName: businesses.name,
      date: businessExpenses.date,
      category: businessExpenses.category,
      description: businessExpenses.description,
      amount: businessExpenses.amount,
      quantity: businessExpenses.quantity,
      recordedByName: recorder.fullName,
      createdAt: businessExpenses.createdAt,
    })
    .from(businessExpenses)
    .innerJoin(businesses, eq(businessExpenses.businessId, businesses.id))
    .leftJoin(recorder, eq(businessExpenses.recordedBy, recorder.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(businessExpenses.date), desc(businessExpenses.createdAt))
    .limit(filters?.limit ?? 200);

  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
    quantity: r.quantity === null ? null : Number(r.quantity),
  }));
}


