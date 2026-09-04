import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { reportQuerySchema } from "@/lib/validators/schemas";
import { listLogs } from "@/lib/queries";
import { renderReportPdf } from "@/lib/pdf/render";
import type { ReportData } from "@/lib/pdf/report-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/pdf?startDate&endDate&supervisorId&guardId&shift&format=pdf
 * Streams a server-rendered PDF (React-PDF) for authorized roles.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!hasPermission(user.role, "REPORTS_FULL_PDF")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = reportQuerySchema.safeParse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    supervisorId: searchParams.get("supervisorId") || undefined,
    guardId: searchParams.get("guardId") || undefined,
    shift: searchParams.get("shift") || undefined,
    format: searchParams.get("format") || "pdf",
  });

  if (!parsed.success) {
    return new Response("Invalid query: " + parsed.error.issues[0]?.message, { status: 400 });
  }
  const v = parsed.data;

  const rows = await listLogs({
    fromDate: v.startDate,
    toDate: v.endDate,
    supervisorId: v.supervisorId,
    guardId: v.guardId,
    shift: v.shift,
    limit: 5000,
  });

  const data: ReportData = {
    title: "Attendance Report",
    company: "HKB Protection & Management Co.",
    startDate: v.startDate,
    endDate: v.endDate,
    generatedAt: new Date().toLocaleString("en-GB"),
    rows: rows.map((r) => ({
      date: r.date,
      shift: r.shift,
      status: r.status,
      guardName: r.guardName,
      employeeId: r.employeeId,
      supervisorName: r.supervisorName,
      absenceCategory: r.absenceCategory,
      allowedDays: r.allowedDays,
      minutesLate: r.minutesLate,
      reason: r.reason,
    })),
  };

  const buffer = await renderReportPdf(data);

  const filename = `attendance-report-${v.startDate}-${v.endDate}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}