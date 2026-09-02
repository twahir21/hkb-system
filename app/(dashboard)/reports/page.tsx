import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listLogs, getSupervisors } from "@/lib/queries";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { Card } from "@/components/ui/Card";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const canFull = hasPermission(user?.role, "REPORTS_FULL_PDF");
  const canSummary = hasPermission(user?.role, "REPORTS_SUMMARY");

  if (!user || (!canFull && !canSummary)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view reports.
      </div>
    );
  }

  if (canFull) {
    const supervisors = await getSupervisors();
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports &amp; Payroll</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate strict, server-rendered PDF attendance reports.
          </p>
        </div>
        <ReportBuilder
          supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName, role: s.role }))}
        />
      </div>
    );
  }

  // Supervisor — summary only (no full PDF).
  const from = daysAgo(30);
  const logs = await listLogs({ fromDate: from, limit: 5000 });
  const present = logs.filter((l) => l.status === "PRESENT").length;
  const absent = logs.length - present;
  const sick = logs.filter((l) => l.absenceCategory === "SICK").length;
  const permitted = logs.filter((l) => l.absenceCategory === "PERMITTED_REASON").length;
  const notPermitted = logs.filter((l) => l.absenceCategory === "NOT_PERMITTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance Summary</h2>
        <p className="mt-1 text-sm text-slate-500">Last 30 days — summary for supervisors.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Shifts recorded", logs.length, "text-slate-900"],
          ["Present", present, "text-emerald-600"],
          ["Absent", absent, "text-rose-600"],
          ["Sick", sick, "text-brand-600"],
          ["Not permitted", notPermitted, "text-rose-600"],
        ].map(([label, value, color]) => (
          <Card key={label as string} className="p-5">
            <p className={`text-2xl font-bold ${color}`}>{value as number}</p>
            <p className="text-xs text-slate-500">{label as string}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Permitted reasons: {permitted}. Full PDF reports are available to Bursar, HR and Super Admin only.
      </p>
    </div>
  );
}