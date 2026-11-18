import { t } from "@/lib/i18n";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listClients } from "@/features/hr/queries/clients";
import { listBranches } from "@/features/branches/queries/branches";
import {
  getIncidentScope,
  listIncidents,
  listSitesForScope,
} from "@/features/incidents/queries/incidents";
import { IncidentReportForm } from "@/features/incidents/components/IncidentReportForm";
import { IncidentList } from "@/features/incidents/components/IncidentList";
import { LEVELS, LEVEL_LABELS } from "@/features/incidents/components/labels";
import type { IncidentLevel, IncidentStatus } from "@/lib/db/schema";

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  const scope = user ? await getIncidentScope(user) : { kind: "none" as const, canAct: false };
  if (!user || scope.kind === "none") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.denied.incidents}
      </div>
    );
  }

  const sp = await searchParams;
  const status = sp.status === "OPEN" || sp.status === "RESOLVED" ? (sp.status as IncidentStatus) : undefined;
  const level = LEVELS.includes(sp.level as IncidentLevel) ? (sp.level as IncidentLevel) : undefined;
  const branchId = scope.kind === "all" ? sp.branchId || undefined : undefined;

  const canReport = hasPermission(user.role, "INCIDENT_REPORT");
  const [rows, sites, clients, branches] = await Promise.all([
    listIncidents(scope, { status, level, branchId }),
    canReport ? listSitesForScope(scope) : Promise.resolve([]),
    canReport ? listClients() : Promise.resolve([]),
    scope.kind === "all" ? listBranches() : Promise.resolve([]),
  ]);

  const subtitle =
    scope.kind === "all"
      ? t.incidentsPage.subtitleAll
      : scope.kind === "branch"
        ? t.incidentsPage.subtitleBranch
        : t.incidentsPage.subtitleOwn;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.incidentsPage.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {canReport && (
          <div className="xl:col-span-1">
            <IncidentReportForm sites={sites} clients={clients} />
          </div>
        )}
        <div className={canReport ? "space-y-3 xl:col-span-2" : "space-y-3 xl:col-span-3"}>
          <form className="flex flex-wrap items-center gap-2">
            <select name="status" defaultValue={status ?? ""} className={selectCls}>
              <option value="">{t.incidentsPage.allStatuses}</option>
              <option value="OPEN">{t.incidentsPage.open}</option>
              <option value="RESOLVED">{t.incidentsPage.resolved}</option>
            </select>
            <select name="level" defaultValue={level ?? ""} className={selectCls}>
              <option value="">{t.incidentsPage.allLevels}</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
            {scope.kind === "all" && (
              <select name="branchId" defaultValue={branchId ?? ""} className={selectCls}>
                <option value="">{t.incidentsPage.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500"
            >
              {t.common.filter}
            </button>
            <Link href="/incidents" className="text-xs text-slate-500 hover:underline">
              {t.common.clear}
            </Link>
          </form>
          <IncidentList rows={rows} canAct={scope.canAct} />
        </div>
      </div>
    </div>
  );
}
