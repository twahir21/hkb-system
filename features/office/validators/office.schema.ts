import { z } from "zod";

export const creditTypes = ["FISH", "MAIZE_FLOUR", "MEDICAL", "OTHER"] as const;
export const creditStatuses = ["OUTSTANDING", "DEDUCTED", "WRITTEN_OFF"] as const;
export const saleTypes = ["CASH", "CREDIT_GUARD"] as const;
export const expenseCategories = ["RESTOCK", "TRANSPORT", "OTHER"] as const;

const uuid = z.string().uuid();
const money = z.coerce.number().nonnegative().max(100_000_000);
const qty = z.coerce.number().positive().max(1_000_000);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)");
const monthStr = z.string().regex(/^\d{4}-\d{2}$/, "Use a valid month (YYYY-MM)");

export const recordCreditSchema = z
  .object({
    guardId: uuid,
    type: z.enum(creditTypes),
    description: z.string().trim().min(2).max(500),
    quantity: qty.optional(),
    amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
    date: dateStr,
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "FISH" || v.type === "MAIZE_FLOUR") && !v.quantity) {
      ctx.addIssue({
        code: "custom",
        message: "Quantity is required when lending fish or maize flour",
      });
    }
  });

export const settleCreditsSchema = z.object({
  creditIds: z.array(uuid).min(1, "Select at least one debt to deduct"),
  deductionMonth: monthStr,
});

export const writeOffCreditSchema = z.object({
  creditId: uuid,
  notes: z.string().trim().min(3, "A reason is required to write off a debt").max(2000),
});

export const restockSchema = z.object({
  businessId: uuid,
  date: dateStr,
  quantity: qty,
  unitCost: money.refine((v) => v > 0, "Unit cost must be greater than zero"),
  description: z.string().trim().min(2).max(500),
});

export const recordSaleSchema = z
  .object({
    businessId: uuid,
    date: dateStr,
    quantity: qty,
    unitPrice: money.refine((v) => v > 0, "Unit price must be greater than zero"),
    saleType: z.enum(saleTypes),
    guardId: uuid.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.saleType === "CREDIT_GUARD" && !v.guardId) {
      ctx.addIssue({ code: "custom", message: "Select the guard buying on credit" });
    }
  });

export const recordExpenseSchema = z.object({
  businessId: uuid,
  date: dateStr,
  category: z.enum(expenseCategories),
  description: z.string().trim().min(2).max(500),
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
});

export type RecordCreditInput = z.infer<typeof recordCreditSchema>;
export type SettleCreditsInput = z.infer<typeof settleCreditsSchema>;
export type RecordSaleInput = z.infer<typeof recordSaleSchema>;
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;
export type RestockInput = z.infer<typeof restockSchema>;
