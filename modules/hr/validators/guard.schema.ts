import { z } from "zod";

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

export type GuardInput = z.infer<typeof guardSchema>;