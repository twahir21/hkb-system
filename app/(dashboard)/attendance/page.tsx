import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getShiftSheet } from "@/features/attendance/queries/attendance";
import { getSupervisors } from "@/features/hr/queries/guards";
import {
  ShiftSheet,
  type ShiftSheetRowDTO,
} from "@/features/attendance/components/ShiftSheet";
import { todayISO } from "@/lib/utils";
import { getGuardScope } from "@/lib/auth/guard-scope";

type PageProps = {
  searchParams: Promise<{
    date?: string;
    shift?: string;
    supervisorId?: string;
    attendanceError?: string;
  }>;
};

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const sp = await searchParams;

  const canRecord = hasPermission(user?.role, "ATTENDANCE_RECORD");
  // In-Charge has no view-all permission but records their own site.
  const canView = hasPermission(user?.role, "ATTENDANCE_VIEW_ALL") || canRecord;
  const canPii = hasPermission(user?.role, "PII_VIEW");

  if (!canView || !user) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view attendance records.
      </div>
    );
  }

  const date = sp.date ?? todayISO();
  const shift = sp.shift === "NIGHT" ? "NIGHT" : "DAY";
  const requestedSupervisor = sp.supervisorId;

  // Supervisors: own guards. Office Assistant: own branch. In-Charge: own site.
  const scope = await getGuardScope(user.userId, user.role);
  const limited = scope.kind !== "all";

  const sheet = await getShiftSheet(
    date,
    shift,
    scope,
    limited ? undefined : requestedSupervisor,
    canPii,
  );
  const supervisors = limited ? [] : await getSupervisors();

  const rows: ShiftSheetRowDTO[] = sheet.map((g) => ({
    id: g.id,
    employeeId: g.employeeId,
    fullName: g.fullName,
    workLocation: g.workLocation,
    homeLocation: canPii ? g.homeLocation : null,
    supervisorName: g.supervisorName,
    leave: g.leave,
    log: g.log
      ? {
          id: g.log.id,
          status: g.log.status,
          absenceCategory: g.log.absenceCategory,
          allowedDays: g.log.allowedDays,
          minutesLate: g.log.minutesLate,
          reason: g.log.reason,
          documentUrl: g.log.documentUrl,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      {sp.attendanceError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {sp.attendanceError}
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Shift Sheet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Per-shift clock-in for{" "}
          {scope.kind === "supervisor"
            ? "your assigned guards"
            : scope.kind === "branch"
              ? "your branch's guards"
              : scope.kind === "stations"
                ? "the guards at your site"
                : scope.kind === "none"
                  ? "guards (none: you have no branch or site yet — ask IT)"
                  : "guards"}.
        </p>
      </div>

      <ShiftSheet
        date={date}
        shift={shift}
        rows={rows}
        supervisors={supervisors.map((s) => ({ id: s.id, name: s.fullName }))}
        supervisorFilter={requestedSupervisor}
        canRecord={canRecord}
        canPii={canPii}
      />
    </div>
  );
}
