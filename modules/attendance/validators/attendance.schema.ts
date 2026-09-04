import { z } from "zod";

import { shiftTypeSchema } from "@/lib/validators/schemas";

export const absenceCategorySchema = z.enum(["SICK", "PERMITTED_REASON", "NOT_PERMITTED"]);

export const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE"]);

export const markAttendanceSchema = z
  .object({
    guardId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    shift: shiftTypeSchema,
    status: attendanceStatusSchema,
    absenceCategory: absenceCategorySchema.optional(),
    allowedDays: z.coerce.number().int().min(1).max(365).optional(),
    minutesLate: z.coerce.number().int().min(1).max(720).optional(),
    reason: z.string().trim().max(2000).optional(),
    documentUrl: z.string().url().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.status === "ABSENT" && !val.absenceCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["absenceCategory"],
        message: "Absence category is required when marking ABSENT",
      });
    }
    if (val.absenceCategory === "SICK" && !val.documentUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documentUrl"],
        message: "A doctor's note must be uploaded for SICK absences",
      });
    }
    if (val.absenceCategory === "PERMITTED_REASON" && !val.allowedDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedDays"],
        message: "Allowed days is required for permitted reasons",
      });
    }
  });

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;