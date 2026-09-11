import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listClientsWithCounts } from "@/features/hr/queries/clients";
import { ClientForm, ClientActiveToggle } from "@/features/hr/components/ClientManager";
import { Badge } from "@/components/ui";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "GUARD_MANAGE")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage clients.
      </div>
    );
  }

  const clients = await listClientsWithCounts();
  const activeCount = clients.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
        <p className="mt-1 text-sm text-slate-500">
          Companies guards work under — {activeCount} active client
          {activeCount === 1 ? "" : "s"}, {clients.length} total.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <ClientForm />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Guards</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500">{c.description ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.guardCount}</td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <Badge tone="emerald">Active</Badge>
                    ) : (
                      <Badge tone="slate">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ClientActiveToggle id={c.id} isActive={c.isActive} />
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No clients yet — add the first one.
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
