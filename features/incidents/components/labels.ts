import { t } from "@/lib/i18n";
import type { IncidentLevel, IncidentStatus } from "@/lib/db/schema";

export const LEVELS: IncidentLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const LEVEL_LABELS: Record<IncidentLevel, string> = {
  LOW: t.status.LOW,
  MEDIUM: t.status.MEDIUM,
  HIGH: t.status.HIGH,
  CRITICAL: t.status.CRITICAL,
};

export const LEVEL_TONES: Record<IncidentLevel, "slate" | "amber" | "rose" | "violet"> = {
  LOW: "slate",
  MEDIUM: "amber",
  HIGH: "rose",
  CRITICAL: "violet",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: t.incidentsPage.open,
  RESOLVED: t.incidentsPage.resolved,
};

export function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dar_es_Salaam",
  });
}
