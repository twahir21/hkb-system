import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listMovements, listItems, listStations } from "@/features/store/queries/stock";
import { Badge, DataTable, type Column } from "@/components/ui";
import type { MovementRow } from "@/features/store/queries/stock";

const movementTone = (t: string) =>
  t === "IN" ? "emerald" : t === "LOST" ? "rose" : t === "RETURNED" ? "brand" : t === "TRANSFER" ? "violet" : "slate";

export default async function StockLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; stationId?: string; type?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STOCK_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        You do not have permission to view the stock ledger.
      </div>
    );
  }

  const sp = await searchParams;
  const [rows, items, stations] = await Promise.all([
    listMovements({
      itemId: sp.itemId || undefined,
      stationId: sp.stationId || undefined,
      type: (sp.type as MovementRow["type"]) || undefined,
      from: sp.from || undefined,
      to: sp.to || undefined,
    }),
    listItems(),
    listStations(),
  ]);

  const columns: Column<MovementRow>[] = [
    {
      key: "type",
      header: "Type",
      cell: (r) => <Badge tone={movementTone(r.type)}>{r.type}</Badge>,
    },
    { key: "item", header: "Item", cell: (r) => <span className="font-medium">{r.itemName}</span> },
    { key: "qty", header: "Qty", cell: (r) => <span>{r.quantity} {r.unit}</span> },
    {
      key: "route",
      header: "From → To",
      cell: (r) => (
        <span className="text-xs text-slate-600">
          {r.fromStation ?? "—"} → {r.toStation ?? "—"}
        </span>
      ),
    },
    {
      key: "detail",
      header: "Detail",
      cell: (r) => (
        <div className="text-xs text-slate-500">
          {r.reference && <p>Ref: {r.reference}</p>}
          {r.reason && <p>{r.reason}</p>}
          {r.unitCost && <p>Unit cost: TZS {Number(r.unitCost).toLocaleString()}</p>}
          {r.receivedBy && <p>Received by {r.receivedBy}</p>}
        </div>
      ),
    },
    {
      key: "meta",
      header: "When / Who",
      cell: (r) => (
        <div className="text-xs text-slate-500">
          <p>{new Date(r.createdAt).toLocaleString("en-GB")}</p>
          <p>by {r.performedBy ?? "—"}</p>
        </div>
      ),
    },
  ];

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Stock Ledger</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every movement: bought, given, returned, lost, transferred and adjusted stock.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Item</span>
          <select name="itemId" defaultValue={sp.itemId ?? ""} className={inputCls}>
            <option value="">All items</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Station</span>
          <select name="stationId" defaultValue={sp.stationId ?? ""} className={inputCls}>
            <option value="">All stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
          <select name="type" defaultValue={sp.type ?? ""} className={inputCls}>
            <option value="">All types</option>
            {["IN", "ISSUED", "OUT", "RETURNED", "LOST", "TRANSFER", "ADJUSTMENT"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">From</span>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">To</span>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputCls} />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Filter
        </button>
      </form>

      <DataTable columns={columns} rows={rows} empty="No stock movements found." />
    </div>
  );
}
