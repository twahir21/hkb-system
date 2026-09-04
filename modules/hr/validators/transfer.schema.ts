import { z } from "zod";

export const transferSchema = z.object({
  guardId: z.string().uuid(),
  toSupervisorId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

export const transferActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

export type TransferInput = z.infer<typeof transferSchema>;
export type TransferActionInput = z.infer<typeof transferActionSchema>;