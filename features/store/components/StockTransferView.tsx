"use client";

import { useActionState, useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Badge, Button, DataTable, Modal, statusTone, type Column } from "@/components/ui";
import {
  approveOrRejectStockTransfer,
  requestStockTransfer,
  type ActionState,
} from "@/features/store/actions/stock.actions";
import type { StockTransferRow } from "@/features/store/queries/stock";

type ItemOpt = { id: string; name: string };
type StationOpt = { id: string; name: string; regionName: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function RequestTransferModal({ items, stations }: { items: ItemOpt[]; stations: StationOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestStockTransfer,
    { ok: false }
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Request transfer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a stock transfer">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>Item</span>
            <select name="itemId" required className={inputCls} defaultValue="">
              <option value="" disabled>Select item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>From station</span>
              <select name="fromStationId" required className={inputCls} defaultValue="">
                <option value="" disabled>From…</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelSpanCls}>To station</span>
              <select name="toStationId" required className={inputCls} defaultValue="">
                <option value="" disabled>To…</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>Quantity</span>
            <input name="quantity" type="number" min={1} required className={inputCls} />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Reason</span>
            <textarea name="reason" rows={3} required className={inputCls} />
          </label>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          {state.ok && state.message && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ReviewCell({ transferId }: { transferId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    approveOrRejectStockTransfer,
    { ok: false }
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={transferId} />
      <Button type="submit" size="sm" variant="success" disabled={pending} name="action" value="APPROVE">
        Approve
      </Button>
      <Button type="submit" size="sm" variant="danger" disabled={pending} name="action" value="REJECT">
        Reject
      </Button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </form>
  );
}

export function StockTransferView({
  transfers,
  items,
  stations,
  canRequest,
  canApprove,
}: {
  transfers: StockTransferRow[];
  items: ItemOpt[];
  stations: StationOpt[];
  canRequest: boolean;
  canApprove: boolean;
}) {
  const columns: Column<StockTransferRow>[] = [
    {
      key: "item",
      header: "Item",
      cell: (r) => (
        <p className="font-medium text-slate-800">
          {r.itemName} <span className="text-xs text-slate-400">× {r.quantity} {r.unit}</span>
        </p>
      ),
    },
    {
      key: "route",
      header: "From → To",
      cell: (r) => (
        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>{r.fromStation}</span>
          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">{r.toStation}</span>
        </p>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (r) => <span className="text-slate-600">{r.reason}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
    },
    {
      key: "meta",
      header: "Requested",
      cell: (r) => (
        <div className="text-xs text-slate-500">
          <p>by {r.requestedBy}</p>
          <p>{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
          {r.reviewerNotes && <p className="text-slate-400">Note: {r.reviewerNotes}</p>}
        </div>
      ),
    },
  ];

  if (canApprove) {
    columns.push({
      key: "action",
      header: "Review",
      cell: (r) =>
        r.status === "PENDING" ? (
          <ReviewCell transferId={r.id} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">
          {transfers.length} stock transfer requests
        </p>
        {canRequest && <RequestTransferModal items={items} stations={stations} />}
      </div>
      <DataTable columns={columns} rows={transfers} empty="No stock transfer requests yet." />
    </div>
  );
}

