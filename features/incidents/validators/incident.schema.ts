import { z } from "zod";
import { incidentLevelEnum } from "@/lib/db/schema";

export const reportIncidentSchema = z.object({
  title: z.string().trim().min(3, "Kichwa kiwe na angalau herufi 3").max(200),
  description: z.string().trim().min(5, "Eleza kilichotokea").max(5000),
  level: z.enum(incidentLevelEnum.enumValues),
  occurredAt: z.coerce.date({ error: "Weka lini kilitokea" }),
  stationId: z.string().uuid("Chagua kituo"),
  clientId: z.string().uuid().optional(),
});

export const incidentActionSchema = z.object({
  incidentId: z.string().uuid(),
  note: z.string().trim().min(3, "Eleza hatua iliyochukuliwa").max(5000),
});

export const incidentStatusSchema = z.object({
  incidentId: z.string().uuid(),
  status: z.enum(["OPEN", "RESOLVED"]),
  note: z.string().trim().max(5000).optional(),
});
