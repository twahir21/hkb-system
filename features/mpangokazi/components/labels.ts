import type { WorkPlanStatus } from "@/lib/db/schema";

export const WORK_PLAN_STATUSES: WorkPlanStatus[] = ["PRESENT", "OFF", "PERMITTED", "SICK", "ABSENT"];

export const WORK_PLAN_STATUS_SW: Record<WorkPlanStatus, string> = {
  PRESENT: "Yupo",
  OFF: "Off",
  PERMITTED: "Ruhusa",
  SICK: "Mgonjwa",
  ABSENT: "Hayupo (bila sababu)",
};
