import { z } from "zod";

export const staffAbsenceCategorySchema = z.enum([
  "SICK",
  "PERMITTED_REASON",
  "NOT_PERMITTED",
]);

export const staffAttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE"]);

export const markStaffAttendanceSchema = z
  .object({
    userId: z.string().uuid("Namba ya mtumishi si sahihi"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe iwe kwa muundo YYYY-MM-DD"),
    status: staffAttendanceStatusSchema,
    checkInTime: z.string().max(20).optional(),
    checkOutTime: z.string().max(20).optional(),
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
        message: "Aina ya kutokuwepo inahitajika unaporekodi HAYUPO",
      });
    }
    if (val.absenceCategory === "PERMITTED_REASON" && !val.allowedDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedDays"],
        message: "Siku zilizoruhusiwa zinahitajika kwa kutokuwepo kwa ruhusa",
      });
    }
    if (val.status === "LATE" && !val.minutesLate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minutesLate"],
        message: "Dakika za kuchelewa zinahitajika unaporekodi AMECHELEWA",
      });
    }
  });

export const batchMarkStaffPresentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe iwe kwa muundo YYYY-MM-DD"),
  checkInTime: z.string().max(20).optional(),
});

/** Super Admin-only: edit the recorded check-in / sign-out times of an existing log.
 *  Empty string means "clear the time". */
export const updateStaffTimesSchema = z.object({
  userId: z.string().uuid("Namba ya mtumishi si sahihi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe iwe kwa muundo YYYY-MM-DD"),
  checkInTime: z.string().max(20).optional(),
  checkOutTime: z.string().max(20).optional(),
});

export const clearStaffAttendanceSchema = z.object({
  userId: z.string().uuid("Namba ya mtumishi si sahihi"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe iwe kwa muundo YYYY-MM-DD"),
});

/** Super Admin-only quick sign-out (userId + date + optional client-stamped time) */
export const staffSignOutSchema = clearStaffAttendanceSchema.extend({
  signOutTime: z.string().max(20).optional(),
});

export type MarkStaffAttendanceInput = z.infer<typeof markStaffAttendanceSchema>;
