import Link from "next/link";
import { ClipboardCheck, Users, ArrowLeftRight, Clock, Award } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { getDashboardCounts, listLogs, getMonthlyAttendanceSummary } from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { hasPermission } from "@/lib/auth/rbac";
import { todayISO } from "@/lib/utils";

function Stat({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
  return (
    <Card className="p-5">
      {href ? (
        <Link href={href} className="block transition-opacity hover:opacity-90">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const name = session.user.name;
  const role = session.user.role;
  const userId = session.user.id;

  const counts = await getDashboardCounts(role, userId);
  const today = todayISO();
  const todaysLogs = await listLogs({ date: today, limit: 2000 });
  const present = todaysLogs.filter((l) => l.status === "PRESENT").length;
  const late = todaysLogs.filter((l) => l.status === "LATE").length;
  const absent = todaysLogs.filter((l) => l.status === "ABSENT").length;

  const now = new Date();
  const monthlySummary = await getMonthlyAttendanceSummary(
    now.getFullYear(),
    now.getMonth() + 1,
    role === "SUPERVISOR" ? userId : undefined
  );

  const canRecord = hasPermission(role, "ATTENDANCE_RECORD");
  const canSeeTransfers = hasPermission(role, "TRANSFER_APPROVE");
  const canSeeGuards = hasPermission(role, "GUARD_MANAGE");
  const canSeeReports = hasPermission(role, "REPORTS_FULL_PDF");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Welcome back, {name.split(" ")[0]}.
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Overview for {today} · role: <span className="font-semibold">{role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Registered Guards" value={counts.totalGuards} icon={<Users className="h-5 w-5" />} href={canSeeGuards ? "/guards" : undefined} />
        <Stat label="Present Today" value={present} icon={<ClipboardCheck className="h-5 w-5 text-emerald-600" />} href="/attendance" />
        <Stat label="Late Today" value={late} icon={<Clock className="h-5 w-5 text-amber-600" />} href="/attendance" />
        <Stat label="Absent Today" value={absent} icon={<ClipboardCheck className="h-5 w-5 text-rose-500" />} href="/records" />
        <Stat
          label={`${monthlySummary.monthName} Rate`}
          value={`${monthlySummary.overallAttendancePercentage}%`}
          icon={<Award className="h-5 w-5 text-brand-600" />}
          href="/reports"
        />
      </div>

      {canSeeTransfers && (
        <Card
          title="Pending Transfers"
          subtitle="Awaiting Admin / HR approval"
          action={
            <Link href="/transfers" className="text-sm font-semibold text-brand-600 hover:underline">
              Review →
            </Link>
          }
        >
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-amber-500" />
            <p className="text-3xl font-bold text-slate-900">{counts.pendingTransfers}</p>
            <Badge tone={counts.pendingTransfers > 0 ? "amber" : "emerald"}>
              {counts.pendingTransfers > 0 ? "Action needed" : "All caught up"}
            </Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {canRecord && (
          <Card title="Today's Shift Board" subtitle="Day / Night per-shift clock-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-3xl font-bold text-emerald-700">{present}</p>
                <p className="text-xs font-medium text-emerald-600">PRESENT</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-3xl font-bold text-rose-700">{absent}</p>
                <p className="text-xs font-medium text-rose-600">ABSENT</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/attendance"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-500"
              >
                Open Shift Sheet
              </Link>
            </div>
          </Card>
        )}

        <Card title="Quick Actions" subtitle="Go to a module">
          <div className="flex flex-wrap gap-2">
            <Link href="/records" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Attendance Records
            </Link>
            {canRecord && (
              <Link href="/attendance" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Shift Sheet
              </Link>
            )}
            {canSeeReports && (
              <Link href="/reports" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Reports
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}