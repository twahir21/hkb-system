import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission, isGuardRole, ROLE_LABELS } from "@/lib/auth/rbac";
import { t } from "@/lib/i18n";
import { getEmployee, listContracts, listEmployeeDocuments } from "@/features/employees/queries/employees";
import { EmployeeDocuments } from "@/features/employees/components/EmployeeDocuments";
import {
  ContractForm,
  ContractRowActions,
  EmployeeProfileForm,
} from "@/features/employees/components/EmployeeForms";
import { Badge, Card } from "@/components/ui";
import { getStaffBranchLimit } from "@/lib/auth/guard-scope";

const STATUS_TONE = { ACTIVE: "emerald", ENDED: "slate", TERMINATED: "rose" } as const;

export default async function EmployeeDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const user = await getCurrentUser();
  const E = t.employees;
  const C = t.contracts;
  if (!user || !hasPermission(user.role, "EMPLOYEE_VIEW")) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">{E.notAllowed}</div>;
  }
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound();

  const emp = await getEmployee(userId);
  if (!emp) notFound();
  // Office Assistant: own branch only.
  const branchLimit = await getStaffBranchLimit(user.userId, user.role);
  if (branchLimit !== null && emp.branchId !== branchLimit) notFound();

  const canEdit = hasPermission(user.role, "EMPLOYEE_MANAGE");
  const canViewContracts = hasPermission(user.role, "CONTRACT_VIEW");
  const canManageContracts = hasPermission(user.role, "CONTRACT_MANAGE");
  const canViewDocs = hasPermission(user.role, "EMPLOYEE_DOC_VIEW");
  const canManageDocs = hasPermission(user.role, "EMPLOYEE_DOC_MANAGE");
  const [contractRows, documentRows] = await Promise.all([
    canViewContracts ? listContracts(userId) : Promise.resolve([]),
    canViewDocs ? listEmployeeDocuments(userId) : Promise.resolve([]),
  ]);
  const p = emp.profile;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/employees${isGuardRole(emp.role) ? "?tab=guards" : ""}`} className="text-xs text-slate-500 hover:underline">
          ← {E.back}
        </Link>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{emp.fullName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {ROLE_LABELS[emp.role]} · {emp.branchName ?? "—"} · {emp.email}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {isGuardRole(emp.role) && !p ? (
          <Card title={E.profile}>
            <p className="text-sm text-slate-500">
              {E.employeeNo}: {emp.guardEmployeeId ?? "—"}.{" "}
              <Link href="/guards" className="font-semibold text-brand-600 hover:underline">
                {t.nav.guards}
              </Link>
            </p>
          </Card>
        ) : (
          <EmployeeProfileForm
            userId={userId}
            canEdit={canEdit}
            defaults={{
              employeeNo: p?.employeeNo ?? null,
              department: p?.department ?? null,
              jobTitle: p?.jobTitle ?? ROLE_LABELS[emp.role],
              hireDate: p?.hireDate ?? null,
              phone: p?.phone ?? null,
              nidaNo: p?.nidaNo ?? null,
              address: p?.address ?? null,
              kinName: p?.kinName ?? null,
              kinPhone: p?.kinPhone ?? null,
            }}
          />
        )}

        {canViewDocs && (
          <EmployeeDocuments
            userId={userId}
            canManage={canManageDocs}
            today={new Date().toISOString().slice(0, 10)}
            documents={documentRows.map((d) => ({
              id: d.id,
              type: d.type,
              title: d.title,
              fileName: d.fileName,
              sizeBytes: d.sizeBytes,
              expiresOn: d.expiresOn,
              uploadedByName: d.uploadedByName,
              createdAt: d.createdAt.toISOString().slice(0, 10),
            }))}
          />
        )}

        {canViewContracts && (
          <div className="space-y-6">
            <Card title={C.title}>
              {contractRows.length === 0 ? (
                <p className="text-sm text-slate-400">{C.none}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {contractRows.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">
                          {c.position} · {C.types[c.type]}{" "}
                          <Badge tone={STATUS_TONE[c.status]}>{C.statuses[c.status]}</Badge>
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.startDate} → {c.endDate ?? E.noEnd}
                          {c.monthlySalary ? ` · TZS ${Number(c.monthlySalary).toLocaleString("en-US")}` : ""}
                        </p>
                        {c.notes && <p className="text-xs text-slate-400">{c.notes}</p>}
                      </div>
                      <ContractRowActions
                        id={c.id}
                        status={c.status}
                        hasDocument={c.hasDocument}
                        canManage={canManageContracts}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {canManageContracts && (
              <ContractForm userId={userId} defaultPosition={p?.jobTitle ?? ROLE_LABELS[emp.role]} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
