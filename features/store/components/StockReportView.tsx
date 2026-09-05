"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Card, DataTable, type Column } from "@/components/ui";
import type { StationReportRow } from "@/features/store/queries/stock";

type StationOpt = { id: string; name: string; regionName: string };

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function StockReportView({
  rows,
  stations,
}: {
  rows: StationReportRow[];
  stations: StationOpt[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [stationId, setStationId] = useState(params.get("stationId") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  const apply = () => {
    const qs = new URLSearchParams();
    if (stationId) qs.set("stationId", stationId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    router.push(`/store/reports${qs.toString() ? `?${qs}` : ""}`);
  };

  const columns: Column<StationReportRow>[] = [
    {
      key: "station",
      header: "Station",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.stationName}</p>
          <p className="text-xs text-slate-400">{r.regionName}</p>
        </div>
      ),
    },
    { key: "item", header: "Item", cell: (r) => <span>{r.itemName}</span> },
    { key: "holding", header: "Holding", cell: (r) => <b>{r.holding} {r.unit}</b> },
    { key: "issued", header: "Given", cell: (r) => <span>{r.issued}</span> },
    {
      key: "lost",
      header: "Lost",
      cell: (r) => (
        <span className={r.lost > 0 ? "font-semibold text-rose-600" : "text-slate-500"}>
          {r.lost}
        </span>
      ),
    },
    { key: "returned", header: "Returned", cell: (r) => <span className="text-emerald-700">{r.returned}</span> },
    { key: "out", header: "Given out", cell: (r) => <span>{r.out}</span> },
    {
      key: "purchased",
      header: "Bought",
      cell: (r) => (
        <div className="text-xs">
          <p>{r.purchased}</p>
          {r.purchaseValue > 0 && (
            <p className="text-slate-400">TZS {r.purchaseValue.toLocaleString()}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card title="Filters" subtitle="Report of holdings, given, lost, returned and bought stock">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={labelSpanCls}>Station</span>
            <select
              className={inputCls}
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              <option value="">All stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              From
            </span>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
            </span>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button size="md" onClick={apply}>Apply</Button>
        </div>
      </Card>
      <DataTable
        columns={columns}
        rows={rows.map((r) => ({ ...r, id: `${r.stationId}-${r.itemId}` }))}
        empty="No stock data for this selection."
      />
    </div>
  );
}
