import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listTransfers, getSupervisors, listGuards } from "@/lib/queries";
import { TransfersView } from "@/components/transfers/TransfersView";

export default async function TransfersPage() {
  const user = await getCurrentUser();
  const canRequest = hasPermission(user?.role, "TRANSFER_INITIATE");
  const canApprove = hasPermission(user?.role, "TRANSFER_APPROVE");

  if (!user || (!canRequest && !canApprove)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view transfers.
      </div>
    );
  }

  const [transfers, supervisors, guards] = await Promise.all([
    listTransfers(),
    getSupervisors(),
    listGuards(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Guard Transfers</h2>
        <p className="mt-1 text-sm text-slate-500">
          {canApprove
            ? "Review and approve guard supervisor transfers."
            : "Request a supervisor transfer for a guard assigned to you."}
        </p>
      </div>
      <TransfersView
        transfers={transfers}
        supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName, role: s.role }))}
        guards={guards.map((g) => ({ id: g.id, name: g.fullName, employeeId: g.employeeId }))}
        canRequest={canRequest}
        canApprove={canApprove}
        currentUserId={user.userId}
      />
    </div>
  );
}