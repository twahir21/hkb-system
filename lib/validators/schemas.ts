import { z } from "zod";

export const shiftTypeSchema = z.enum(["DAY", "NIGHT"]);
export const absenceCategorySchema = z.enum(["SICK", "PERMITTED_REASON", "NOT_PERMITTED"]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

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

export const guardSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(255),
  employeeId: z.string().trim().min(1).max(50),
  age: z.coerce.number().int().min(16).max(100),
  phone: z.string().trim().min(7).max(20),
  homeLocation: z.string().trim().min(1).max(255),
  workLocation: z.string().trim().min(1).max(255),
  kinName: z.string().trim().min(1).max(255),
  kinRelation: z.string().trim().min(1).max(100),
  kinPhone: z.string().trim().min(7).max(20),
  registrationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedSupervisorId: z.string().uuid().optional().nullable(),
});

export const transferSchema = z.object({
  guardId: z.string().uuid(),
  toSupervisorId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
});

export const transferActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

export const reportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supervisorId: z.string().uuid().optional(),
  guardId: z.string().uuid().optional(),
  shift: shiftTypeSchema.optional(),
  format: z.literal("pdf").optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type GuardInput = z.infer<typeof guardSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type TransferActionInput = z.infer<typeof transferActionSchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;