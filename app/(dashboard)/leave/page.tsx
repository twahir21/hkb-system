import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { t } from "@/lib/i18n";
import {
  getLeaveBalance,
  getLeaveScope,
  listLeaveEmployees,
  listLeaveRequests,
} from "@/features/leave/queries/leave";
import { LeaveDecision, LeaveRequestForm } from "@/features/leave/components/LeaveForms";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

const TONE = { PENDING: "amber", APPROVED: "emerald", REJECTED: "rose", CANCELLED: "slate" } as const;

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const L = t.leave;

  const sp = await searchParams;
  const pendingOnly = sp.status === "PENDING";
  const scope = await getLeaveScope(user);
  const canFileOthers = hasPermission(user.role, "LEAVE_FILE_FOR_OTHERS");
  const canApprove = hasPermission(user.role, "LEAVE_APPROVE");

  const [rows, balance, employees] = await Promise.all([
    listLeaveRequests(scope, pendingOnly ? "PENDING" : undefined),
    getLeaveBalance(user.userId),
    canFileOthers ? listLeaveEmployees(scope) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{L.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{L.subtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <LeaveRequestForm selfId={user.userId} employees={employees} />
          <Card title={L.balanceTitle}>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 text-left font-medium">{L.type}</th>
                  <th className="py-1 text-right font-medium">{L.entitled}</th>
                  <th className="py-1 text-right font-medium">{L.used}</th>
                  <th className="py-1 text-right font-medium">{L.left}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balance.map((b) => (
                  <tr key={b.type}>
                    <td className="py-1.5 text-slate-700">{L.types[b.type]}</td>
                    <td className="py-1.5 text-right">{b.entitled ?? L.noLimit}</td>
                    <td className="py-1.5 text-right">{b.used}</td>
                    <td className={cn("py-1.5 text-right font-semibold", b.left !== null && b.left <= 0 && "text-rose-600")}>
                      {b.left ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{L.requests}</h3>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <Link href="/leave" className={cn("rounded-lg px-3 py-1.5", !pendingOnly ? "bg-white shadow-sm" : "text-slate-500")}>
                {L.filter.all}
              </Link>
              <Link href="/leave?status=PENDING" className={cn("rounded-lg px-3 py-1.5", pendingOnly ? "bg-white shadow-sm" : "text-slate-500")}>
                {L.filter.pending}
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">{L.employee}</th>
                  <th className="px-4 py-3">{L.type}</th>
                  <th className="px-4 py-3">{L.from} – {L.to}</th>
                  <th className="px-4 py-3">{L.status}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.employeeName}</p>
                      {r.filedByName !== r.employeeName && (
                        <p className="text-[11px] text-slate-400">
                          {L.filedBy}: {r.filedByName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {L.types[r.type]}
                      {r.reason && <p className="text-[11px] text-slate-400">{r.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.startDate} – {r.endDate}
                      <p className="text-[11px] text-slate-400">
                        {r.days} {L.days.toLowerCase()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={TONE[r.status]}>{L.statuses[r.status]}</Badge>
                      {r.reviewedByName && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {r.reviewedByName}
                          {r.reviewNotes ? ` — ${r.reviewNotes}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "PENDING" && (
                        <LeaveDecision
                          id={r.id}
                          canApprove={canApprove && r.userId !== user.userId}
                          canCancel={r.userId === user.userId}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      {L.none}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
