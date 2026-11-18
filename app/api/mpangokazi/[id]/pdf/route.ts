import { getCurrentUser } from "@/lib/auth/dal";
import { getWorkPlan, getWorkPlanViewScope } from "@/features/mpangokazi/queries/mpangokazi";
import { renderMpangokaziPdf } from "@/lib/pdf/mpangokazi-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/mpangokazi/:id/pdf — Fomu ya Mpangokazi as PDF (inside the viewer's scope). */
export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const scope = await getWorkPlanViewScope(user);
  const plan = await getWorkPlan(scope, id);
  if (!plan) return new Response("Not found", { status: 404 });

  const buffer = await renderMpangokaziPdf({
    company: "HKB Protection & Management Co.",
    date: plan.date,
    branchName: plan.branchName ?? "—",
    preparedByName: plan.preparedByName,
    jobPosition: plan.jobPosition,
    signatureDataUrl: plan.signatureDataUrl,
    totals: {
      total: plan.totalGuards,
      present: plan.presentCount,
      off: plan.offCount,
      permitted: plan.permittedCount,
      sick: plan.sickCount,
      absent: plan.absentCount,
    },
    notes: plan.notes,
    entries: plan.entries,
  });

  const safeBranch = (plan.branchName ?? "mkoa").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `mpangokazi-${safeBranch}-${plan.date}.pdf`;
  const inline = new URL(_request.url).searchParams.get("inline") === "1";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
