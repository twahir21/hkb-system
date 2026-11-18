import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getStaffAttendanceSheet,
  listStaffAttendanceLogs,
} from "@/features/staff-attendance/queries/staff-attendance";
import { StaffAttendanceView } from "@/features/staff-attendance/components/StaffAttendanceView";
import { todayISO } from "@/lib/utils";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";

type PageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
  }>;
};

export default async function StaffAttendancePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const sp = await searchParams;

  const canView = hasPermission(user?.role, "STAFF_ATTENDANCE_VIEW");
  const canRecord = hasPermission(user?.role, "STAFF_ATTENDANCE_RECORD");
  const canEdit = hasPermission(user?.role, "STAFF_ATTENDANCE_EDIT");
  const canEditTime = hasPermission(user?.role, "STAFF_ATTENDANCE_EDIT_TIME");

  if (!canView || !user) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view staff attendance records.
      </div>
    );
  }

  const date = sp.date ?? todayISO();

  // Office Assistant: own branch's staff only.
  const branchLimit = await getStaffBranchLimit(user.userId, user.role);
  if (branchLimit === "none") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        You have no branch yet. Ask IT to set your branch.
      </div>
    );
  }
  const branchId = branchLimit ?? undefined;

  const [sheetRows, historyLogs] = await Promise.all([
    getStaffAttendanceSheet(date, branchId),
    listStaffAttendanceLogs({ branchId, limit: 1000 }),
  ]);

  return (
    <div className="space-y-6">
      {sp.error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {sp.error}
        </div>
      )}

      <StaffAttendanceView
        date={date}
        rows={sheetRows}
        historyLogs={historyLogs}
        canRecord={canRecord}
        canEdit={canEdit}
        canEditTime={canEditTime}
      />
    </div>
  );
}
