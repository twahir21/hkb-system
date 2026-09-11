import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const clientUpdateSchema = clientSchema.partial().extend({
  id: z.string().uuid(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;