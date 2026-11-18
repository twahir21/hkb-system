import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/rbac";
import { t } from "@/lib/i18n";
import { listEmployees, listExpiringContracts } from "@/features/employees/queries/employees";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const user = await getCurrentUser();
  const E = t.employees;
  if (!user || !hasPermission(user.role, "EMPLOYEE_VIEW")) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">{E.notAllowed}</div>;
  }
  const canContracts = hasPermission(user.role, "CONTRACT_VIEW");
  // Office Assistant: own branch only.
  const branchLimit = await getStaffBranchLimit(user.userId, user.role);
  if (branchLimit === "none") {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">{E.notAllowed}</div>;
  }

  const sp = await searchParams;
  const tab = sp.tab === "guards" ? "guards" : sp.tab === "expiring" && canContracts ? "expiring" : "staff";
  const q = (sp.q ?? "").trim().toLowerCase();

  const tabs = [
    ["staff", E.tabStaff],
    ["guards", E.tabGuards],
    ...(canContracts ? [["expiring", E.tabExpiring]] : []),
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{E.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{E.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              href={`/employees?tab=${key}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold",
                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        {tab !== "expiring" && (
          <form className="flex gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder={E.search}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </form>
        )}
      </div>

      {tab === "expiring" ? <ExpiringTable /> : <EmployeeTable group={tab} q={q} showContracts={canContracts} branchId={branchLimit ?? undefined} />}
    </div>
  );
}

async function EmployeeTable({
  group,
  q,
  showContracts,
  branchId,
}: {
  group: "staff" | "guards";
  q: string;
  showContracts: boolean;
  branchId?: string;
}) {
  const E = t.employees;
  const rows = (await listEmployees(group, branchId)).filter((r) => !q || r.fullName.toLowerCase().includes(q));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <th className="px-4 py-3">{E.name}</th>
            <th className="px-4 py-3">{E.department}</th>
            <th className="px-4 py-3">{E.branch}</th>
            <th className="px-4 py-3">{E.phone}</th>
            {showContracts && <th className="px-4 py-3">{E.contractEnds}</th>}
            <th className="px-4 py-3 text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.userId} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{r.fullName}</p>
                <p className="text-[11px] text-slate-400">
                  {r.jobTitle ?? ROLE_LABELS[r.role]}
                  {r.employeeNo ? ` · ${r.employeeNo}` : ""}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.department ? t.departments[r.department] : "—"}</td>
              <td className="px-4 py-3 text-slate-600">{r.branchName ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{r.phone ?? "—"}</td>
              {showContracts && (
                <td className="px-4 py-3">
                  {!r.hasActiveContract ? (
                    <Badge tone="amber">{E.noContract}</Badge>
                  ) : r.contractEnd ? (
                    <span className="text-slate-700">{r.contractEnd}</span>
                  ) : (
                    <Badge tone="emerald">{E.noEnd}</Badge>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <Link href={`/employees/${r.userId}`} className="text-xs font-semibold text-brand-600 hover:underline">
                  {E.open}
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                {E.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

async function ExpiringTable() {
  const C = t.contracts;
  const rows = await listExpiringContracts(60);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <th className="px-4 py-3">{t.employees.name}</th>
            <th className="px-4 py-3">{C.position}</th>
            <th className="px-4 py-3">{C.end}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{r.fullName}</td>
              <td className="px-4 py-3 text-slate-600">{r.position}</td>
              <td className="px-4 py-3">
                {r.endDate}{" "}
                {r.daysLeft < 0 ? (
                  <Badge tone="rose">{C.expired}</Badge>
                ) : (
                  <Badge tone={r.daysLeft <= 30 ? "rose" : "amber"}>
                    {r.daysLeft} {C.daysLeft}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/employees/${r.userId}`} className="text-xs font-semibold text-brand-600 hover:underline">
                  {t.employees.open}
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                {C.none}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
