import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/rbac";
import { listMovements, listItems, listStations } from "@/features/store/queries/stock";
import { Badge, DataTable, type Column } from "@/components/ui";
import type { MovementRow } from "@/features/store/queries/stock";
import { enumLabel, t } from "@/lib/i18n";

const movementTone = (m: string) =>
  m === "IN" ? "emerald" : m === "LOST" ? "rose" : m === "RETURNED" ? "brand" : m === "TRANSFER" ? "violet" : "slate";

export default async function StockLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; stationId?: string; type?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user?.role, "STOCK_VIEW")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
        {t.store.deniedLedger}
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
      header: t.common.type,
      cell: (r) => <Badge tone={movementTone(r.type)}>{enumLabel(r.type)}</Badge>,
    },
    { key: "item", header: t.store.item, cell: (r) => <span className="font-medium">{r.itemName}</span> },
    { key: "qty", header: t.store.qty, cell: (r) => <span>{r.quantity} {r.unit}</span> },
    {
      key: "route",
      header: t.store.fromTo,
      cell: (r) => (
        <span className="text-xs text-slate-600">
          {r.fromStation ?? "—"} → {r.toStation ?? "—"}
        </span>
      ),
    },
    {
      key: "detail",
      header: t.store.detail,
      cell: (r) => (
        <div className="text-xs text-slate-500">
          {r.reference && <p>{t.store.ref}: {r.reference}</p>}
          {r.reason && <p>{r.reason}</p>}
          {r.unitCost && <p>{t.store.unitCost}: TZS {Number(r.unitCost).toLocaleString()}</p>}
          {r.receivedBy && <p>{t.store.receivedBy} {r.receivedBy}</p>}
        </div>
      ),
    },
    {
      key: "meta",
      header: t.store.whenWho,
      cell: (r) => (
        <div className="text-xs text-slate-500">
          <p>{new Date(r.createdAt).toLocaleString("en-GB")}</p>
          <p>{t.store.by} {r.performedBy ?? "—"}</p>
        </div>
      ),
    },
  ];

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t.store.ledgerTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t.store.ledgerSubtitle}
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.store.item}</span>
          <select name="itemId" defaultValue={sp.itemId ?? ""} className={inputCls}>
            <option value="">{t.store.allItems}</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.common.station}</span>
          <select name="stationId" defaultValue={sp.stationId ?? ""} className={inputCls}>
            <option value="">{t.store.allStations}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.common.type}</span>
          <select name="type" defaultValue={sp.type ?? ""} className={inputCls}>
            <option value="">{t.store.allTypes}</option>
            {["IN", "ISSUED", "OUT", "RETURNED", "LOST", "TRANSFER", "ADJUSTMENT"].map((m) => (
              <option key={m} value={m}>{enumLabel(m)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.common.from}</span>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t.common.to}</span>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputCls} />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          {t.common.filter}
        </button>
      </form>

      <DataTable columns={columns} rows={rows} empty={t.store.noMovements} />
    </div>
  );
}
