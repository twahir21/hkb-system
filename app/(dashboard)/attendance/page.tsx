import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { getShiftSheet, getSupervisors } from "@/lib/queries";
import { ShiftSheet, type ShiftSheetRowDTO } from "@/components/attendance/ShiftSheet";
import { todayISO } from "@/lib/utils";

type PageProps = { searchParams: Promise<{ date?: string; shift?: string; supervisorId?: string }> };

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const sp = await searchParams;

  const canView = hasPermission(user?.role, "ATTENDANCE_VIEW_ALL");
  const canRecord = hasPermission(user?.role, "ATTENDANCE_RECORD");
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

  // A plain supervisor only ever sees their own assigned guards.
  const scopeSupervisor = user.role === "SUPERVISOR" ? user.userId : requestedSupervisor;

  const sheet = await getShiftSheet(date, shift, scopeSupervisor, canPii);
  const supervisors = user.role === "SUPERVISOR" ? [] : await getSupervisors();

  const rows: ShiftSheetRowDTO[] = sheet.map((g) => ({
    id: g.id,
    employeeId: g.employeeId,
    fullName: g.fullName,
    workLocation: g.workLocation,
    homeLocation: canPii ? g.homeLocation : null,
    supervisorName: g.supervisorName,
    log: g.log
      ? {
          id: g.log.id,
          status: g.log.status,
          absenceCategory: g.log.absenceCategory,
          allowedDays: g.log.allowedDays,
          reason: g.log.reason,
          documentUrl: g.log.documentUrl,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Shift Sheet</h2>
        <p className="mt-1 text-sm text-slate-500">
          Per-shift clock-in for {user.role === "SUPERVISOR" ? "your assigned guards" : "guards"}.
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