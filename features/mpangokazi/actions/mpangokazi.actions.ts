"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workPlanEntries, workPlans, workPlanStatusEnum, type WorkPlanStatus } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/auth/audit";
import { getUserBranch } from "@/features/branches/queries/branches";
import { getScopeGuards } from "@/features/mpangokazi/queries/mpangokazi";

export type WorkPlanActionState = { ok: boolean; error?: string; message?: string; id?: string };

const MAX_SIGNATURE_CHARS = 300_000; // ~220 KB PNG

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarehe si sahihi"),
  branchId: z.string().uuid().optional(),
  jobPosition: z.string().trim().min(2, "Andika cheo chako").max(150),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", "Weka sahihi yako")
    .max(MAX_SIGNATURE_CHARS, "Sahihi ni kubwa mno"),
  notes: z.string().trim().max(2000).optional(),
  entries: z
    .array(
      z.object({
        guardId: z.string().uuid(),
        status: z.enum(workPlanStatusEnum.enumValues),
      })
    )
    .min(1, "Hakuna walinzi kwenye fomu"),
});

/** Save (create or replace) today's Fomu ya Mpangokazi for the logged-in preparer. */
export async function saveWorkPlan(
  _prev: WorkPlanActionState,
  formData: FormData
): Promise<WorkPlanActionState> {
  const user = await requirePermission("MPANGOKAZI_SUBMIT");

  let entriesJson: unknown;
  try {
    entriesJson = JSON.parse(String(formData.get("entries") ?? "[]"));
  } catch {
    return { ok: false, error: "Orodha ya walinzi si sahihi." };
  }

  const parsed = saveSchema.safeParse({
    date: formData.get("date") ?? undefined,
    branchId: formData.get("branchId") || undefined,
    jobPosition: formData.get("jobPosition") ?? undefined,
    signatureDataUrl: formData.get("signatureDataUrl") ?? undefined,
    notes: formData.get("notes") || undefined,
    entries: entriesJson,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Fomu si sahihi" };
  }
  const v = parsed.data;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Dar_es_Salaam" });
  if (v.date > today) return { ok: false, error: "Huwezi kujaza fomu ya siku zijazo." };

  const branchWide = hasPermission(user.role, "MPANGOKAZI_BRANCH_WIDE");
  const ownBranch = await getUserBranch(user.userId);
  const branchId = branchWide ? (v.branchId ?? ownBranch?.id ?? null) : (ownBranch?.id ?? null);

  // Names and points come from the server, never from the browser.
  const scopeGuards = await getScopeGuards({ userId: user.userId, branchWide, branchId, date: v.date });
  const byId = new Map(scopeGuards.map((g) => [g.guardId, g]));
  const seen = new Set<string>();
  const rows: { guardId: string; guardName: string; point: string; status: WorkPlanStatus }[] = [];
  for (const e of v.entries) {
    const g = byId.get(e.guardId);
    if (!g || seen.has(e.guardId)) {
      return { ok: false, error: "Fomu ina mlinzi asiye wa eneo lako. Pakia upya ukurasa." };
    }
    seen.add(e.guardId);
    rows.push({ guardId: g.guardId, guardName: g.guardName, point: g.point, status: e.status });
  }

  const count = (s: WorkPlanStatus) => rows.filter((r) => r.status === s).length;
  const values = {
    date: v.date,
    branchId,
    preparedById: user.userId,
    preparedByName: user.name,
    jobPosition: v.jobPosition || ROLE_LABELS[user.role],
    signatureDataUrl: v.signatureDataUrl,
    totalGuards: rows.length,
    presentCount: count("PRESENT"),
    offCount: count("OFF"),
    permittedCount: count("PERMITTED"),
    sickCount: count("SICK"),
    absentCount: count("ABSENT"),
    notes: v.notes ?? null,
    updatedAt: new Date(),
  };

  // One report per preparer per day: re-sending replaces it.
  const existing = await db.query.workPlans.findFirst({
    where: and(eq(workPlans.preparedById, user.userId), eq(workPlans.date, v.date)),
    columns: { id: true },
  });

  let id: string;
  if (existing) {
    id = existing.id;
    await db.update(workPlans).set(values).where(eq(workPlans.id, id));
    await db.delete(workPlanEntries).where(eq(workPlanEntries.workPlanId, id));
  } else {
    const [created] = await db.insert(workPlans).values(values).returning({ id: workPlans.id });
    id = created.id;
  }
  await db
    .insert(workPlanEntries)
    .values(rows.map((r, i) => ({ ...r, workPlanId: id, position: i + 1 })));

  await writeAuditLog({
    actorId: user.userId,
    action: existing ? "MPANGOKAZI_UPDATE" : "MPANGOKAZI_CREATE",
    entity: "work_plans",
    entityId: id,
    metadata: { date: v.date, branchId, total: rows.length },
  });

  revalidatePath("/mpangokazi");
  return { ok: true, id, message: existing ? "Fomu imesasishwa." : "Fomu imehifadhiwa." };
}
