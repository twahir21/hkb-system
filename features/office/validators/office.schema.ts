import { z } from "zod";

export const creditTypes = ["FISH", "MAIZE_FLOUR", "MEDICAL", "OTHER"] as const;
export const creditStatuses = ["OUTSTANDING", "DEDUCTED", "WRITTEN_OFF"] as const;
export const saleTypes = ["CASH", "CREDIT_GUARD"] as const;
export const expenseCategories = ["RESTOCK", "TRANSPORT", "OTHER"] as const;

const uuid = z.string().uuid();
const money = z.coerce.number().nonnegative().max(100_000_000);
const qty = z.coerce.number().positive().max(1_000_000);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tumia tarehe sahihi (YYYY-MM-DD)");
const monthStr = z.string().regex(/^\d{4}-\d{2}$/, "Tumia mwezi sahihi (YYYY-MM)");

export const recordCreditSchema = z
  .object({
    guardId: uuid,
    type: z.enum(creditTypes),
    description: z.string().trim().min(2).max(500),
    quantity: qty.optional(),
    amount: money.refine((v) => v > 0, "Kiasi lazima kiwe zaidi ya sifuri"),
    date: dateStr,
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "FISH" || v.type === "MAIZE_FLOUR") && !v.quantity) {
      ctx.addIssue({
        code: "custom",
        message: "Idadi inahitajika unapokopesha samaki au unga",
      });
    }
  });

export const settleCreditsSchema = z.object({
  creditIds: z.array(uuid).min(1, "Chagua angalau deni moja la kukata"),
  deductionMonth: monthStr,
});

export const writeOffCreditSchema = z.object({
  creditId: uuid,
  notes: z.string().trim().min(3, "Sababu inahitajika kufuta deni").max(2000),
});

export const restockSchema = z.object({
  businessId: uuid,
  date: dateStr,
  quantity: qty,
  unitCost: money.refine((v) => v > 0, "Bei ya kununua lazima iwe zaidi ya sifuri"),
  description: z.string().trim().min(2).max(500),
});

export const recordSaleSchema = z
  .object({
    businessId: uuid,
    date: dateStr,
    quantity: qty,
    unitPrice: money.refine((v) => v > 0, "Bei ya kuuza lazima iwe zaidi ya sifuri"),
    saleType: z.enum(saleTypes),
    guardId: uuid.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.saleType === "CREDIT_GUARD" && !v.guardId) {
      ctx.addIssue({ code: "custom", message: "Chagua mlinzi anayenunua kwa mkopo" });
    }
  });

export const recordExpenseSchema = z.object({
  businessId: uuid,
  date: dateStr,
  category: z.enum(expenseCategories),
  description: z.string().trim().min(2).max(500),
  amount: money.refine((v) => v > 0, "Kiasi lazima kiwe zaidi ya sifuri"),
});

export type RecordCreditInput = z.infer<typeof recordCreditSchema>;
export type SettleCreditsInput = z.infer<typeof settleCreditsSchema>;
export type RecordSaleInput = z.infer<typeof recordSaleSchema>;
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;
export type RestockInput = z.infer<typeof restockSchema>;
