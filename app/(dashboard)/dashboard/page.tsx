import Link from "next/link";
import {
  ClipboardCheck,
  Users,
  ArrowLeftRight,
  Clock,
  Award,
  Package,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import {
  getDashboardCounts,
  get7DayAttendanceTrend,
  listLogs,
  getMonthlyAttendanceSummary,
} from "@/lib/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  AttendanceTrendAreaChart,
  TodayShiftDonutChart,
} from "@/components/ui/charts";
import { hasPermission } from "@/lib/auth/rbac";
import { todayISO } from "@/lib/utils";

function Stat({
  label,
  value,
  icon,
  href,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  subtitle?: string;
}) {
  const inner = (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 truncate">{label}</p>
        {subtitle && (
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">{subtitle}</p>
        )}
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

  const supervisorFilter = role === "SUPERVISOR" ? userId : undefined;
  const sevenDayTrend = await get7DayAttendanceTrend(supervisorFilter);

  const now = new Date();
  const monthlySummary = await getMonthlyAttendanceSummary(
    now.getFullYear(),
    now.getMonth() + 1,
    supervisorFilter
  );

  const canRecord = hasPermission(role, "ATTENDANCE_RECORD");
  const canSeeTransfers = hasPermission(role, "TRANSFER_APPROVE");
  const canSeeGuards = hasPermission(role, "GUARD_MANAGE");
  const canSeeReports = hasPermission(role, "REPORTS_FULL_PDF");
  const canStock = hasPermission(role, "STOCK_TRANSFER_APPROVE");
  const canCoverage = hasPermission(role, "COVERAGE_VIEW");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Welcome back, {name.split(" ")[0]}.
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Overview for {today} · Role: <span className="font-semibold text-slate-700">{role.replace(/_/g, " ")}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/attendance"
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-500"
          >
            Open Shift Sheet →
          </Link>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label={role === "SUPERVISOR" ? "Assigned Guards" : "Registered Guards"}
          value={role === "SUPERVISOR" ? counts.assignedGuards : counts.totalGuards}
          icon={<Users className="h-5 w-5" />}
          href={canSeeGuards ? "/guards" : undefined}
          subtitle={
            canSeeGuards && counts.unassignedGuards > 0
              ? `${counts.unassignedGuards} unassigned`
              : undefined
          }
        />
        <Stat
          label="Present Today"
          value={present}
          icon={<ClipboardCheck className="h-5 w-5 text-emerald-600" />}
          href="/attendance"
          subtitle="On-time clock-in"
        />
        <Stat
          label="Late Today"
          value={late}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          href="/attendance"
          subtitle="Late arrivals"
        />
        <Stat
          label="Absent Today"
          value={absent}
          icon={<ClipboardCheck className="h-5 w-5 text-rose-500" />}
          href="/records"
          subtitle="Sick / unexcused"
        />
        <Stat
          label={`${monthlySummary.monthName} Rate`}
          value={`${monthlySummary.overallAttendancePercentage}%`}
          icon={<Award className="h-5 w-5 text-brand-600" />}
          href="/reports"
          subtitle={`${monthlySummary.totalShifts} shifts logged`}
        />
      </div>

      {/* Visual Charts: 7-Day Trend + Today's Shift Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceTrendAreaChart
            data={sevenDayTrend}
            title="7-Day Attendance Trend"
            subtitle="Daily operational flow across all active stations"
            height={260}
          />
        </div>
        <div className="lg:col-span-1">
          <TodayShiftDonutChart
            present={present}
            late={late}
            absent={absent}
          />
        </div>
      </div>

      {/* Action / Operational Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {canSeeTransfers && (
          <Card
            title="Pending Guard Transfers"
            subtitle="Awaiting Admin / HR approval"
            action={
              <Link
                href="/transfers"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Review →
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5 text-amber-500" />
              <p className="text-3xl font-bold text-slate-900">
                {counts.pendingTransfers}
              </p>
              <Badge tone={counts.pendingTransfers > 0 ? "amber" : "emerald"}>
                {counts.pendingTransfers > 0 ? "Action needed" : "All caught up"}
              </Badge>
            </div>
          </Card>
        )}

        {canStock && (
          <Card
            title="Stock Transfers"
            subtitle="Inter-station inventory movements"
            action={
              <Link
                href="/store/transfers"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View →
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-indigo-500" />
              <p className="text-3xl font-bold text-slate-900">
                {counts.pendingStockTransfers}
              </p>
              <Badge tone={counts.pendingStockTransfers > 0 ? "amber" : "slate"}>
                {counts.pendingStockTransfers > 0 ? "Pending" : "No pending"}
              </Badge>
            </div>
          </Card>
        )}

        {canCoverage && (
          <Card
            title="Coverage Inquiries"
            subtitle="Client security requests"
            action={
              <Link
                href="/coverage-requests"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Inquiries →
              </Link>
            }
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <p className="text-3xl font-bold text-slate-900">
                {counts.pendingCoverageRequests}
              </p>
              <Badge tone={counts.pendingCoverageRequests > 0 ? "amber" : "slate"}>
                {counts.pendingCoverageRequests > 0 ? "New" : "Cleared"}
              </Badge>
            </div>
          </Card>
        )}
      </div>

      {/* Module Shortcuts */}
      <Card title="Quick Navigation" subtitle="Jump directly to key management modules">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/records"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" /> Attendance Records
          </Link>
          {canRecord && (
            <Link
              href="/attendance"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-slate-500" /> Shift Sheet
            </Link>
          )}
          {canSeeReports && (
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Award className="h-3.5 w-3.5 text-slate-500" /> Monthly Reports &amp; PDF
            </Link>
          )}
          {canSeeGuards && (
            <Link
              href="/guards"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" /> Guard Registry
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}