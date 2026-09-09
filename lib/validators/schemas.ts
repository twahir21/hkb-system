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

/** Public "Request Coverage" submission from the marketing website. */
const phoneRegex = /^\+?[0-9][0-9\s\-()]{6,25}$/;

export const coverageRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(255, "Full name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email is required")
    .max(255),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "A valid phone number is required")
    .max(32),
  service: z
    .string()
    .trim()
    .min(2, "Service is required")
    .max(150, "Service is too long"),
  message: z
    .string()
    .trim()
    .min(5, "Message is required")
    .max(5000, "Message is too long"),
  source: z.string().trim().max(100).optional(),
});

export type CoverageRequestInput = z.infer<typeof coverageRequestSchema>;

/** Payload for Super Admin managing a coverage request via server actions. */
export const coverageRequestUpdateSchema = z.object({
  status: z.enum(["NEW", "IN_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]),
  internalNotes: z.string().trim().max(5000).optional(),
});
