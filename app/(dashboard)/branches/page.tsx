import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listBranchesWithOwners } from "@/features/branches/queries/branches";
import { BranchForm, MakeHqButton } from "@/features/branches/components/BranchManager";
import { Badge } from "@/components/ui";

export default async function BranchesPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "BRANCH_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage branches.
      </div>
    );
  }

  const rows = await listBranchesWithOwners();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Branches</h2>
        <p className="mt-1 text-sm text-slate-500">
          One system for HQ and every remote branch. Office Assistants own their branch — assign
          them in User Accounts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <BranchForm />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Owner (Office Assistant)</th>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {b.name} {b.isHq && <Badge tone="brand">HQ</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.isHq ? "—" : b.owners.length ? b.owners.join(", ") : (
                      <span className="text-amber-600">No owner yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.staffCount}</td>
                  <td className="px-4 py-3 text-right">{!b.isHq && <MakeHqButton id={b.id} />}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    No branches yet — run the database migration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
