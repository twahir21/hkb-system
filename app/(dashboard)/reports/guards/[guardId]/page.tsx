import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getGuardMonthlyDetail, getGuardByUserId } from "@/lib/queries";
import { GuardMonthlyDetail, tierBadge } from "@/components/reports/GuardMonthlyDetail";

type PageProps = {
  params: Promise<{ guardId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function GuardMonthlyDetailPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  const { guardId } = await params;
  const sp = await searchParams;

  const canViewAll = hasPermission(user?.role, "ATTENDANCE_VIEW_ALL");
  const isOwnGuardProfile =
    user?.role === "GUARD" && (await getGuardByUserId(user.userId))?.id === guardId;

  if (!user || (!canViewAll && !isOwnGuardProfile)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view this attendance summary.
      </div>
    );
  }

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;

  const detail = await getGuardMonthlyDetail(guardId, year, month);
  if (!detail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        Guard profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{detail.guard.fullName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {detail.guard.employeeId} · {detail.guard.workLocation}
            {detail.guard.supervisorName ? ` · Supervisor: ${detail.guard.supervisorName}` : ""}
          </p>
        </div>
        {tierBadge(detail.performanceTier)}
      </div>

      <GuardMonthlyDetail detail={detail} basePath={`/reports/guards/${guardId}`} />
    </div>
  );
}
