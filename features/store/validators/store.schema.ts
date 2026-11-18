import { z } from "zod";

export const movementTypes = [
  "IN",
  "ISSUED",
  "OUT",
  "RETURNED",
  "LOST",
  "TRANSFER",
  "ADJUSTMENT",
] as const;

const uuid = z.string().uuid();
const positiveInt = z.coerce.number().int().positive();

export const itemSchema = z.object({
  name: z.string().trim().min(2).max(200),
  unit: z.string().trim().min(1).max(50).default("pcs"),
  category: z.string().trim().max(100).optional(),
});

export const itemUpdateSchema = itemSchema.extend({
  id: uuid,
  isActive: z.coerce.boolean().optional(),
});

export const regionSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  /** Branch that owns the region. Empty = none (incidents fall back to reporter's branch). */
  branchId: uuid.optional(),
});

export const regionBranchSchema = z.object({
  id: uuid,
  branchId: uuid.nullable(),
});

export const stationSchema = z.object({
  name: z.string().trim().min(2).max(150),
  regionId: uuid,
  supervisorId: uuid.optional(),
  /** In-Charge (guard leader) of this site. One site per In-Charge. */
  inChargeId: uuid.optional(),
});

export const stationUpdateSchema = stationSchema.extend({
  id: uuid,
});

/**
 * A single stock movement. `type` determines which location fields are
 * required:
 *  - IN            → toStation (main store or a station)
 *  - ISSUED        → fromStation + toStation (e.g. main store → station)
 *  - OUT / LOST /
 *    ADJUSTMENT /
 *    RETURNED      → fromStation
 *  - TRANSFER      → fromStation + toStation (should go through the
 *                    stock transfer approval flow instead)
 */
export const movementSchema = z
  .object({
    itemId: uuid,
    type: z.enum(movementTypes),
    quantity: positiveInt,
    fromStationId: uuid.optional(),
    toStationId: uuid.optional(),
    unitCost: z.coerce.number().nonnegative().optional(),
    reference: z.string().trim().max(150).optional(),
    reason: z.string().trim().max(2000).optional(),
    receivedById: uuid.optional(),
    returnedMovementId: uuid.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "IN" && !v.toStationId) {
      ctx.addIssue({ code: "custom", message: "Ununuzi unahitaji kituo kinachopokea" });
    }
    if (v.type === "ISSUED" && (!v.fromStationId || !v.toStationId)) {
      ctx.addIssue({
        code: "custom",
        message: "Kutoa mali kunahitaji kituo kinachotoa na kinachopokea",
      });
    }
    if (["OUT", "LOST", "ADJUSTMENT", "RETURNED"].includes(v.type) && !v.fromStationId) {
      ctx.addIssue({ code: "custom", message: "Mwenendo huu unahitaji kituo kinachotoa" });
    }
    if (v.type === "TRANSFER" && (!v.fromStationId || !v.toStationId)) {
      ctx.addIssue({
        code: "custom",
        message: "Uhamisho unahitaji kituo kinachotoa na kinachopokea",
      });
    }
    if (["LOST", "ADJUSTMENT"].includes(v.type) && !v.reason) {
      ctx.addIssue({
        code: "custom",
        message: "Sababu inahitajika kwa mali iliyopotea na marekebisho",
      });
    }
    if (v.type === "RETURNED" && !v.returnedMovementId) {
      ctx.addIssue({
        code: "custom",
        message: "Urudishaji lazima uhusiane na utoaji wa awali",
      });
    }
  });

export const stockTransferSchema = z
  .object({
    itemId: uuid,
    fromStationId: uuid,
    toStationId: uuid,
    quantity: positiveInt,
    reason: z.string().trim().min(3).max(2000),
  })
  .refine((v) => v.fromStationId !== v.toStationId, {
    message: "Kituo kinachotoa na kinachopokea lazima viwe tofauti",
  });

export const stockTransferActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

export type ItemInput = z.infer<typeof itemSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
