import { getCurrentUser } from "@/lib/auth/dal";
import { getGuardMonthlyDetail, getGuardByUserId } from "@/lib/queries";
import { GuardMonthlyDetail } from "@/components/reports/GuardMonthlyDetail";

type PageProps = { searchParams: Promise<{ month?: string; year?: string }> };

/** Guard-facing self-service monthly attendance summary. */
export default async function MySummaryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || user.role !== "GUARD") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        This summary is only available to guard accounts.
      </div>
    );
  }

  const profile = await getGuardByUserId(user.userId);
  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        No guard profile is linked to your account yet. Please contact your administrator.
      </div>
    );
  }

  const sp = await searchParams;
  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;

  const detail = await getGuardMonthlyDetail(profile.id, year, month);
  if (!detail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
        Attendance summary is not available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Attendance Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your monthly attendance rate, late arrivals, and per-day log.
        </p>
      </div>

      <GuardMonthlyDetail detail={detail} basePath="/my-summary" />
    </div>
  );
}
