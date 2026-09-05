import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listItems } from "@/features/store/queries/stock";
import { ItemForm, ItemActiveToggle } from "@/features/store";

export default async function StoreItemsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STORE_MANAGE_ITEMS")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to manage store items.
      </div>
    );
  }

  const items = await listItems();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Store Items</h2>
        <p className="mt-1 text-sm text-slate-500">Registry of stockable items.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ItemForm />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{i.name}</td>
                  <td className="px-4 py-3">{i.unit}</td>
                  <td className="px-4 py-3 text-slate-500">{i.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        i.isActive
                          ? "font-medium text-emerald-700"
                          : "font-medium text-slate-400"
                      }
                    >
                      {i.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ItemActiveToggle id={i.id} isActive={i.isActive} />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No items yet — add the first one.
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
