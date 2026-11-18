import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission, isGuardRole } from "@/lib/auth/rbac";
import { listLogs } from "@/lib/queries";
import { getGuardByUserId } from "@/lib/queries";
import { RecordsView } from "@/components/records/RecordsView";
import { getGuardScope, getScopedGuardIds } from "@/lib/auth/guard-scope";

export default async function RecordsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  let logs: Awaited<ReturnType<typeof listLogs>>;
  if (isGuardRole(user.role)) {
    // Guards see only their own logs.
    const profile = await getGuardByUserId(user.userId);
    logs = profile ? await listLogs({ guardId: profile.id, limit: 2000 }) : [];
  } else if (hasPermission(user.role, "ATTENDANCE_VIEW_ALL")) {
    // Office Assistant: own branch only. Supervisors keep the full history view.
    const scope = await getGuardScope(user.userId, user.role);
    const guardIds = scope.kind === "supervisor" ? null : await getScopedGuardIds(scope);
    logs = await listLogs({ guardIds, limit: 2000 });
  } else {
    logs = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance Records</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isGuardRole(user.role) ? "Your recorded attendances." : "Search and review all attendance logs."}
        </p>
      </div>
      <RecordsView logs={logs} />
    </div>
  );
}