import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getSupervisors, getMonthlyAttendanceSummary } from "@/lib/queries";
import { MonthlySummaryView } from "@/components/reports/MonthlySummaryView";
import { ReportBuilder } from "@/components/reports/ReportBuilder";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  const canFull = hasPermission(user?.role, "REPORTS_FULL_PDF");
  const canSummary = hasPermission(user?.role, "REPORTS_SUMMARY");

  if (!user || (!canFull && !canSummary)) {
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
  const summary = await getMonthlyAttendanceSummary(year, month, supervisorId, canPii);
  const supervisors = await getSupervisors();

  const tab = sp.tab || "monthly";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance &amp; Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly overall and individual employee attendance summaries, late tracking, and PDF exports.
          </p>
        </div>

        {canFull && (
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
          </div>
        )}
      </div>

      {tab === "custom" && canFull ? (
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