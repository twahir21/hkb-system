import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listCoverageRequests } from "@/features/coverage/queries/coverage";
import { CoverageRequestsView } from "@/features/coverage/components/CoverageRequestsView";
import { MarkCoverageSeen } from "@/features/coverage/components/MarkCoverageSeen";

export default async function CoverageRequestsPage() {
  const user = await getCurrentUser();
  const canView = hasPermission(user?.role, "COVERAGE_VIEW");

  if (!user || !canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.denied.coverage}
      </div>
    );
  }

  const canManage = hasPermission(user.role, "COVERAGE_MANAGE");
  const requests = await listCoverageRequests();

  return (
    <div className="space-y-6">
      <MarkCoverageSeen />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.coveragePage.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? t.coveragePage.subtitleManage
            : t.coveragePage.subtitleRead}
        </p>
      </div>
      <CoverageRequestsView requests={requests} canManage={canManage} />
    </div>
  );
}