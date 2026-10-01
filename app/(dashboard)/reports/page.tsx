import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors, getMonthlyAttendanceSummary } from "@/lib/queries";
import { listRegions } from "@/features/store/queries/stock";
import { listClients } from "@/features/hr/queries/clients";
import { MonthlySummaryView } from "@/components/reports/MonthlySummaryView";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { GuardPayrollExportBuilder } from "@/components/reports/GuardPayrollExportBuilder";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  const canFull = hasPermission(user?.role, "REPORTS_FULL_PDF");
  const canSummary = hasPermission(user?.role, "REPORTS_SUMMARY");
  const canPayrollExport = hasPermission(user?.role, "PAYROLL_EXPORT");

  if (!user || (!canFull && !canSummary && !canPayrollExport)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view reports or attendance summaries.
      </div>
    );
  }

  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;
  const supervisorId =
    user.role === "SUPERVISOR" ? user.userId : sp.supervisorId || undefined;

  const canPii = hasPermission(user.role, "PII_VIEW");
  const [summary, supervisors, regions, clients] = await Promise.all([
    getMonthlyAttendanceSummary(year, month, supervisorId, canPii),
    getSupervisors(),
    listRegions(),
    listClients(),
  ]);

  const tab = sp.tab || "monthly";
  const defaultMonthStr = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance &amp; Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly overall and individual employee attendance summaries, late tracking, and PDF exports.
          </p>
        </div>

        <div className="flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {canSummary && (
            <a
              href={`/reports?tab=monthly${sp.month ? `&month=${sp.month}` : ""}${
                sp.year ? `&year=${sp.year}` : ""
              }`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === "monthly"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Summary
            </a>
          )}
          {canFull && (
            <a
              href="/reports?tab=custom"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === "custom"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom Date PDF Builder
            </a>
          )}
          {canPayrollExport && (
            <a
              href="/reports?tab=guards-pdf"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === "guards-pdf"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Guard Payroll Export PDF
            </a>
          )}
        </div>
      </div>

      {tab === "guards-pdf" && canPayrollExport ? (
        <GuardPayrollExportBuilder
          supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName, role: s.role }))}
          regions={regions.map((r) => ({ id: r.id, name: r.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          defaultMonth={defaultMonthStr}
        />
      ) : tab === "custom" && canFull ? (
        <ReportBuilder
          supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName, role: s.role }))}
        />
      ) : (
        <MonthlySummaryView
          summary={summary}
          supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName, role: s.role }))}
        />
      )}
    </div>
  );
}