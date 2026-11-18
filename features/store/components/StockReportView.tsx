"use client";

import { t } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Button, Card, DataTable, Pagination, type Column } from "@/components/ui";
import { StockCategoryBarChart } from "@/components/ui/charts";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const apply = () => {
    setPage(1);
    const qs = new URLSearchParams();
    if (stationId) qs.set("stationId", stationId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    router.push(`/store/reports${qs.toString() ? `?${qs}` : ""}`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const columns: Column<StationReportRow>[] = [
    {
      key: "station",
      header: t.common.station,
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.stationName}</p>
          <p className="text-xs text-slate-400">{r.regionName}</p>
        </div>
      ),
    },
    { key: "item", header: t.store.item, cell: (r) => <span>{r.itemName}</span> },
    { key: "holding", header: t.store.holding, cell: (r) => <b>{r.holding} {r.unit}</b> },
    { key: "issued", header: t.storeForms.given, cell: (r) => <span>{r.issued}</span> },
    {
      key: "lost",
      header: t.status.LOST,
      cell: (r) => (
        <span className={r.lost > 0 ? "font-semibold text-rose-600" : "text-slate-500"}>
          {r.lost}
        </span>
      ),
    },
    { key: "returned", header: t.status.RETURNED, cell: (r) => <span className="text-emerald-700">{r.returned}</span> },
    { key: "out", header: t.storeForms.givenOut, cell: (r) => <span>{r.out}</span> },
    {
      key: "purchased",
      header: t.storeForms.bought,
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
      <Card title={t.storeForms.filters} subtitle={t.storeForms.filtersSub}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className={labelSpanCls}>{t.common.station}</span>
            <select
              className={inputCls}
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              <option value="">{t.store.allStations}</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.common.from}
            </span>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.common.to}
            </span>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button size="md" onClick={apply}>{t.office.apply}</Button>
        </div>
      </Card>

      {rows.length > 0 && <StockCategoryBarChart rows={rows} />}

      <DataTable
        columns={columns}
        rows={paginatedRows.map((r) => ({ ...r, id: `${r.stationId}-${r.itemId}` }))}
        empty={t.storeForms.noData}
      />

      {rows.length > 0 && (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemLabel={t.storeForms.reportItems}
        />
      )}
    </div>
  );
}
