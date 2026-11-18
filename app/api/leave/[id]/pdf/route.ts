import { getCurrentUser } from "@/lib/auth/dal";
import { t } from "@/lib/i18n";
import { getLeaveForLetter, getLeaveScope } from "@/features/leave/queries/leave";
import { renderLeaveLetterPdf } from "@/lib/pdf/leave-letter-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** GET /api/leave/:id/pdf — approval letter for an APPROVED leave request (inside the viewer's scope). */
export async function GET(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const scope = await getLeaveScope(user);
  const leave = await getLeaveForLetter(scope, id);
  if (!leave) return new Response("Not found", { status: 404 });
  if (leave.status !== "APPROVED") {
    return new Response("Letter is only available for approved leave", { status: 409 });
  }

  const approvedOn = leave.reviewedAt ? leave.reviewedAt.toISOString().slice(0, 10) : null;
  const buffer = await renderLeaveLetterPdf({
    company: "HKB Protection & Management Co.",
    reference: `HKB/LK/${leave.startDate.slice(0, 4)}/${leave.id.slice(0, 8).toUpperCase()}`,
    issuedOn: approvedOn ?? new Date().toISOString().slice(0, 10),
    employeeName: leave.employeeName,
    employeeNo: leave.employeeNo,
    jobTitle: leave.jobTitle,
    branchName: leave.branchName,
    typeLabel: t.leave.types[leave.type],
    startDate: leave.startDate,
    endDate: leave.endDate,
    returnDate: addDays(leave.endDate, 1),
    days: leave.days,
    reason: leave.reason,
    approvedByName: leave.reviewedByName,
    approvedOn,
    reviewNotes: leave.reviewNotes,
  });

  const safeName = leave.employeeName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `likizo-${safeName}-${leave.startDate}.pdf`;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
