import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listLogs } from "@/lib/queries";
import { getGuardByUserId } from "@/lib/queries";
import { RecordsView } from "@/components/records/RecordsView";

export default async function RecordsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  let logs: Awaited<ReturnType<typeof listLogs>>;
  if (user.role === "GUARD") {
    // Guards see only their own logs.
    const profile = await getGuardByUserId(user.userId);
    logs = profile ? await listLogs({ guardId: profile.id, limit: 2000 }) : [];
  } else if (hasPermission(user.role, "ATTENDANCE_VIEW_ALL")) {
    logs = await listLogs({ limit: 2000 });
  } else {
    logs = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance Records</h2>
        <p className="mt-1 text-sm text-slate-500">
          {user.role === "GUARD" ? "Your recorded attendances." : "Search and review all attendance logs."}
        </p>
      </div>
      <RecordsView logs={logs} />
    </div>
  );
}