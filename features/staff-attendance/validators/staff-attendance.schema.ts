import { z } from "zod";

export const staffAbsenceCategorySchema = z.enum([
  "SICK",
  "PERMITTED_REASON",
  "NOT_PERMITTED",
]);

export const staffAttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE"]);

export const markStaffAttendanceSchema = z
  .object({
    userId: z.string().uuid("Invalid staff user ID"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    status: staffAttendanceStatusSchema,
    checkInTime: z.string().max(20).optional(),
    absenceCategory: staffAbsenceCategorySchema.optional(),
    allowedDays: z.coerce.number().int().min(1).max(365).optional(),
    minutesLate: z.coerce.number().int().min(1).max(720).optional(),
    reason: z.string().trim().max(2000).optional(),
    documentUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.status === "ABSENT" && !val.absenceCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["absenceCategory"],
        message: "Absence category is required when marking ABSENT",
      });
    }
    if (val.absenceCategory === "PERMITTED_REASON" && !val.allowedDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedDays"],
        message: "Allowed days is required for permitted absences",
      });
    }
    if (val.status === "LATE" && !val.minutesLate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minutesLate"],
        message: "Minutes late is required when marking LATE",
      });
    }
  });

export const batchMarkStaffPresentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  checkInTime: z.string().max(20).optional(),
});

export const clearStaffAttendanceSchema = z.object({
  userId: z.string().uuid("Invalid staff user ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

export type MarkStaffAttendanceInput = z.infer<typeof markStaffAttendanceSchema>;
