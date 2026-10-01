import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listStaffAttendanceLogs } from "@/features/staff-attendance/queries/staff-attendance";
import { renderStaffReportPdf, type StaffReportData } from "@/lib/pdf/staff-report-document";
import type { Role, AttendanceStatus } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/staff-attendance/pdf?date=YYYY-MM-DD&startDate=&endDate=&role=&status=
 * Streams server-rendered PDF for authorized staff attendance roles.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!hasPermission(user.role, "STAFF_ATTENDANCE_VIEW")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const role = searchParams.get("role") as Role | null;
  const status = searchParams.get("status") as AttendanceStatus | null;

  const rows = await listStaffAttendanceLogs({
    date: date || undefined,
    fromDate: startDate || undefined,
    toDate: endDate || undefined,
    role: role || undefined,
    status: status || undefined,
    limit: 2000,
  });

  const reportData: StaffReportData = {
    title: "Staff Attendance & Roll Call Register",
    company: "HKB Protection & Management Co.",
    date: date || new Date().toISOString().slice(0, 10),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    generatedAt: new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    generatedBy: `${user.name} (${user.role})`,
    rows: rows.map((r) => ({
      date: r.date,
      staffName: r.staffName,
      staffEmail: r.staffEmail,
      staffRole: r.staffRole,
      staffGender: r.staffGender,
      status: r.status,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      absenceCategory: r.absenceCategory,
      allowedDays: r.allowedDays,
      minutesLate: r.minutesLate,
      reason: r.reason,
      recordedByName: r.recordedByName,
    })),
  };

  const buffer = await renderStaffReportPdf(reportData);

  const filename = `hkb-staff-attendance-${date || "report"}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
