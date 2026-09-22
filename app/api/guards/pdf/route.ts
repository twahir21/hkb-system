import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/auth/audit";
import { guardPayrollExportQuerySchema } from "@/lib/validators/schemas";
import { getGuardPayrollExport, monthPeriod, rangePeriod } from "@/features/hr/queries/guard-export";
import { renderGuardPayrollPdf, type GuardPayrollPdfData } from "@/lib/pdf/guard-payroll-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/guards/pdf?month=YYYY-MM | startDate&endDate
 *                      &regionId&clientId&supervisorId&status&includeZeroActivity&includeDetails
 * Streams the guard payroll export PDF (full profile + attendance + outstanding debt).
 * Payroll is intentionally NOT computed here — this is the working sheet for the bursar.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!hasPermission(user.role, "PAYROLL_EXPORT")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = guardPayrollExportQuerySchema.safeParse({
    month: searchParams.get("month") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    regionId: searchParams.get("regionId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    supervisorId: searchParams.get("supervisorId") || undefined,
    status: searchParams.get("status") || undefined,
    includeZeroActivity: searchParams.get("includeZeroActivity") ?? undefined,
    includeDetails: searchParams.get("includeDetails") ?? undefined,
    format: searchParams.get("format") || "pdf",
  });

  if (!parsed.success) {
    return new Response("Invalid query: " + parsed.error.issues[0]?.message, { status: 400 });
  }
  const v = parsed.data;

  const period = v.month ? monthPeriod(v.month) : rangePeriod(v.startDate!, v.endDate!);
  const includePii = hasPermission(user.role, "PII_VIEW");

  const exportData = await getGuardPayrollExport({
    fromDate: period.fromDate,
    toDate: period.toDate,
    regionId: v.regionId,
    clientId: v.clientId,
    supervisorId: v.supervisorId,
    status: v.status ?? "ALL",
    includeZeroActivity: Boolean(v.includeZeroActivity),
    includePii,
  });

  const scopeLines: string[] = [exportData.filters.statusLabel];
  if (exportData.filters.regionName) scopeLines.push(`Region: ${exportData.filters.regionName}`);
  if (exportData.filters.clientName) scopeLines.push(`Client: ${exportData.filters.clientName}`);
  if (exportData.filters.supervisorName)
    scopeLines.push(`Supervisor: ${exportData.filters.supervisorName}`);
  if (!v.includeZeroActivity) scopeLines.push("Only guards with activity or outstanding debt");
  if (v.includeZeroActivity) scopeLines.push("Zero-activity guards included");
  if (!includePii) scopeLines.push("Personal contact details withheld");

  const data: GuardPayrollPdfData = {
    title: "Guard Payroll Export",
    company: "HKB Protection & Management Co.",
    companySubtitle: "Guard Profile, Attendance & Credit Summary — Payroll Working Sheet",
    periodLabel: period.label,
    startDate: period.fromDate,
    endDate: period.toDate,
    generatedAt: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    generatedBy: `${user.name} (${user.role})`,
    scopeLines,
    piiIncluded: includePii,
    includeDetails: Boolean(v.includeDetails),
    totals: exportData.totals,
    rows: exportData.rows.map((r) => ({
      employeeId: r.employeeId,
      fullName: r.fullName,
      gender: r.gender,
      age: r.age,
      phone: r.phone,
      email: r.email,
      homeLocation: r.homeLocation,
      workLocation: r.workLocation,
      regionName: r.regionName,
      clientName: r.clientName,
      supervisorName: r.supervisorName,
      registrationDate: r.registrationDate,
      kinName: r.kinName,
      kinRelation: r.kinRelation,
      kinPhone: r.kinPhone,
      isActive: r.isActive,
      disabledAtLabel: r.disabledAt
        ? new Date(r.disabledAt).toLocaleDateString("en-GB", { dateStyle: "medium" })
        : null,
      totalShifts: r.totalShifts,
      presentCount: r.presentCount,
      lateCount: r.lateCount,
      absentCount: r.absentCount,
      sickCount: r.sickCount,
      permittedCount: r.permittedCount,
      notPermittedCount: r.notPermittedCount,
      totalMinutesLate: r.totalMinutesLate,
      attendancePercentage: r.attendancePercentage,
      onTimePercentage: r.onTimePercentage,
      outstandingDebt: r.outstandingDebt,
      outstandingCount: r.outstandingCount,
      deductedThisPeriod: r.deductedThisPeriod,
    })),
  };

  const buffer = await renderGuardPayrollPdf(data);

  await writeAuditLog({
    actorId: user.userId,
    action: "GUARD_PAYROLL_EXPORT",
    entity: "guard",
    metadata: {
      period: `${period.fromDate}..${period.toDate}`,
      status: v.status ?? "ALL",
      regionId: v.regionId ?? null,
      clientId: v.clientId ?? null,
      supervisorId: v.supervisorId ?? null,
      includePii,
      rows: data.rows.length,
    },
  });

  const filename = `hkb-guard-payroll-${period.fromDate}_to_${period.toDate}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
