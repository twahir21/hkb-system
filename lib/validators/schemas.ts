/**
 * Cross-module shared schemas (auth, reports). Module-specific schemas live in
 * `modules/<module>/validators/`.
 */
import { z } from "zod";

export const shiftTypeSchema = z.enum(["DAY", "NIGHT"]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const reportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supervisorId: z.string().uuid().optional(),
  guardId: z.string().uuid().optional(),
  shift: shiftTypeSchema.optional(),
  format: z.literal("pdf").optional(),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
