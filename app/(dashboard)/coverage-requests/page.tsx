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
        You do not have permission to view coverage requests.
      </div>
    );
  }

  const canManage = hasPermission(user.role, "COVERAGE_MANAGE");
  const requests = await listCoverageRequests();

  return (
    <div className="space-y-6">
      <MarkCoverageSeen />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Coverage Requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? "Public enquiries from the website. Update status, add internal notes or delete."
            : "Public enquiries from the website (read-only). Contact the Super Admin for changes."}
        </p>
      </div>
      <CoverageRequestsView requests={requests} canManage={canManage} />
    </div>
  );
}