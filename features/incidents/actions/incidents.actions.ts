"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { incidentActions, incidents, regions, stations } from "@/lib/db/schema";
import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  incidentActionSchema,
  incidentStatusSchema,
  reportIncidentSchema,
} from "@/features/incidents/validators/incident.schema";
import { canActOnIncident, getIncidentScope } from "@/features/incidents/queries/incidents";
import { getUserBranch } from "@/features/branches/queries/branches";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

function revalidate() {
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
}

/** Report a new incident at a site. */
export async function reportIncident(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("INCIDENT_REPORT");

  const parsed = reportIncidentSchema.safeParse({
    title: formData.get("title") ?? undefined,
    description: formData.get("description") ?? undefined,
    level: formData.get("level") ?? undefined,
    occurredAt: formData.get("occurredAt") || undefined,
    stationId: formData.get("stationId") || undefined,
    clientId: formData.get("clientId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Tukio si sahihi" };
  }
  const v = parsed.data;

  if (v.occurredAt.getTime() > Date.now() + 5 * 60_000) {
    return { ok: false, error: "The incident time cannot be in the future." };
  }

  const [site] = await db
    .select({ branchId: regions.branchId })
    .from(stations)
    .innerJoin(regions, eq(stations.regionId, regions.id))
    .where(eq(stations.id, v.stationId))
    .limit(1);
  if (!site) return { ok: false, error: "Kituo ulichochagua hakipo tena." };

  const reporterBranch = await getUserBranch(user.userId);
  const branchId = site.branchId ?? reporterBranch?.id ?? null;

  // Branch-scoped users (Office Assistants) may only report for their own branch.
  const scope = await getIncidentScope(user);
  if (scope.kind === "branch" && branchId !== scope.branchId) {
    return { ok: false, error: "Unaweza kuripoti matukio ya vituo vya tawi lako pekee." };
  }

  const [created] = await db
    .insert(incidents)
    .values({
      title: v.title,
      description: v.description,
      level: v.level,
      occurredAt: v.occurredAt,
      stationId: v.stationId,
      clientId: v.clientId ?? null,
      branchId,
      reportedById: user.userId,
    })
    .returning({ id: incidents.id });

  await writeAuditLog({
    actorId: user.userId,
    action: "INCIDENT_REPORT",
    entity: "incidents",
    entityId: created.id,
    metadata: { level: v.level, stationId: v.stationId, branchId },
  });

  revalidate();
  return { ok: true, message: "Tukio limeripotiwa." };
}

/** Log an action taken on an incident (managers only, inside their scope). */
export async function addIncidentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Hujaingia kwenye mfumo." };

  const parsed = incidentActionSchema.safeParse({
    incidentId: formData.get("incidentId") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Kitendo si sahihi" };
  }

  const scope = await getIncidentScope(user);
  if (!(await canActOnIncident(scope, parsed.data.incidentId))) {
    return { ok: false, error: "Huna ruhusa ya kushughulikia tukio hili." };
  }

  await db.insert(incidentActions).values({
    incidentId: parsed.data.incidentId,
    note: parsed.data.note,
    actorId: user.userId,
  });
  await db
    .update(incidents)
    .set({ updatedAt: new Date() })
    .where(eq(incidents.id, parsed.data.incidentId));

  await writeAuditLog({
    actorId: user.userId,
    action: "INCIDENT_ACTION",
    entity: "incidents",
    entityId: parsed.data.incidentId,
  });

  revalidate();
  return { ok: true, message: "Hatua imerekodiwa." };
}

/** Mark an incident solved (RESOLVED) or reopen it (OPEN). */
export async function setIncidentStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Hujaingia kwenye mfumo." };
  if (
    !hasPermission(user.role, "INCIDENT_MANAGE_ALL") &&
    !hasPermission(user.role, "INCIDENT_MANAGE_BRANCH")
  ) {
    return { ok: false, error: "Huna ruhusa ya kubadilisha hali ya tukio." };
  }

  const parsed = incidentStatusSchema.safeParse({
    incidentId: formData.get("incidentId") ?? undefined,
    status: formData.get("status") ?? undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Hali si sahihi" };
  }
  const v = parsed.data;

  const scope = await getIncidentScope(user);
  if (!(await canActOnIncident(scope, v.incidentId))) {
    return { ok: false, error: "Huna ruhusa ya kushughulikia tukio hili." };
  }

  const resolved = v.status === "RESOLVED";
  await db
    .update(incidents)
    .set({
      status: v.status,
      resolvedById: resolved ? user.userId : null,
      resolvedAt: resolved ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(incidents.id, v.incidentId));

  await db.insert(incidentActions).values({
    incidentId: v.incidentId,
    note: v.note || (resolved ? "Limewekwa kuwa limetatuliwa." : "Reopened."),
    actorId: user.userId,
  });

  await writeAuditLog({
    actorId: user.userId,
    action: resolved ? "INCIDENT_RESOLVE" : "INCIDENT_REOPEN",
    entity: "incidents",
    entityId: v.incidentId,
  });

  revalidate();
  return { ok: true, message: resolved ? "Tukio limewekwa kuwa limetatuliwa." : "Tukio limefunguliwa tena." };
}
