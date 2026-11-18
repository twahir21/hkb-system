import { z } from "zod";
import { incidentLevelEnum } from "@/lib/db/schema";

export const reportIncidentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(5, "Describe what happened").max(5000),
  level: z.enum(incidentLevelEnum.enumValues),
  occurredAt: z.coerce.date({ error: "Enter when it happened" }),
  stationId: z.string().uuid("Choose the site"),
  clientId: z.string().uuid().optional(),
});

export const incidentActionSchema = z.object({
  incidentId: z.string().uuid(),
  note: z.string().trim().min(3, "Describe the action taken").max(5000),
});

export const incidentStatusSchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(["OPEN", "RESOLVED"]),
  note: z.string().trim().max(5000).optional(),
});
