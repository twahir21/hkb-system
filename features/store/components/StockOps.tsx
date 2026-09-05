"use client";

import { useActionState, useState } from "react";
import { Plus, PackagePlus, PackageMinus, Undo2, AlertTriangle } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  recordPurchase,
  recordLossOrOut,
  issueStock,
  returnStock,
  type ActionState,
} from "@/features/store/actions/stock.actions";
import type { OpenIssueRow } from "@/features/store/queries/stock";

type ItemOpt = { id: string; name: string; unit: string };
type StationOpt = { id: string; name: string; regionName: string };
type UserOpt = { id: string; fullName: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const labelCls = "block";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}
    </>
  );
}

function SubmitRow({
  pending,
  onClose,
  label,
}: {
  pending: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onClose} type="button">
        Close
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

function StationSelect({
  name,
  stations,
  required = true,
  defaultValue = "",
}: {
  name: string;
  stations: StationOpt[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <select name={name} required={required} className={inputCls} defaultValue={defaultValue}>
      <option value="" disabled>
        Select station…
      </option>
      {stations.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {s.regionName}
        </option>
      ))}
    </select>
  );
}

function ItemSelect({ items }: { items: ItemOpt[] }) {
  return (
    <select name="itemId" required className={inputCls} defaultValue="">
      <option value="" disabled>Select item…</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>{i.name}</option>
      ))}
    </select>
  );
}

export function PurchaseModal({ items, stations, users }: { items: ItemOpt[]; stations: StationOpt[]; users: UserOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordPurchase,
    { ok: false }
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" /> Buy stock
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record stock purchase (IN)">
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>Item</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Destination station</span>
            <StationSelect name="toStationId" stations={stations} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span className={labelSpanCls}>Quantity</span>
              <input name="quantity" type="number" min={1} required className={inputCls} />
            </label>
            <label className={labelCls}>
              <span className={labelSpanCls}>Unit cost (TZS)</span>
              <input name="unitCost" type="number" min={0} step="0.01" className={inputCls} />
            </label>
          </div>
          <label className={labelCls}>
            <span className={labelSpanCls}>Reference (supplier / invoice)</span>
            <input name="reference" className={inputCls} placeholder="e.g. INV-2026-014" />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Received by</span>
            <select name="receivedById" className={inputCls} defaultValue="">
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record purchase" />
        </form>
      </Modal>
    </>
  );
}

export function IssueModal({ items, stations, users }: { items: ItemOpt[]; stations: StationOpt[]; users: UserOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    issueStock,
    { ok: false }
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PackageMinus className="h-4 w-4" /> Give stock
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Issue stock to a station / storekeeper">
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>Item</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>From station</span>
            <StationSelect name="fromStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>To station</span>
            <StationSelect name="toStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Quantity</span>
            <input name="quantity" type="number" min={1} required className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Received by</span>
            <select name="receivedById" className={inputCls} defaultValue="">
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Note (optional)</span>
            <input name="reason" className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Issue stock" />
        </form>
      </Modal>
    </>
  );
}

export function ReturnModal({ stations, openIssues }: { stations: StationOpt[]; openIssues: OpenIssueRow[] }) {
  const [open, setOpen] = useState(false);
  const [issueId, setIssueId] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    returnStock,
    { ok: false }
  );
  const selected = openIssues.find((i) => i.movementId === issueId);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Undo2 className="h-4 w-4" /> Return stock
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Return stock to the store">
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>Original issue</span>
            <select
              name="returnedMovementId"
              required
              className={inputCls}
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
            >
              <option value="" disabled>Select issued stock…</option>
              {openIssues.map((i) => (
                <option key={i.movementId} value={i.movementId}>
                  {i.itemName} — {i.stationName || "—"} ({i.outstanding} {i.unit} outstanding)
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="itemId" value={selected?.itemId ?? ""} />
          <input type="hidden" name="fromStationId" value={selected?.stationId ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span className={labelSpanCls}>Quantity</span>
              <input
                name="quantity"
                type="number"
                min={1}
                max={selected?.outstanding}
                required
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              <span className={labelSpanCls}>Return to (optional)</span>
              <select name="toStationId" className={inputCls} defaultValue="">
                <option value="">Main store</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelCls}>
            <span className={labelSpanCls}>Note (optional)</span>
            <input name="reason" className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record return" />
        </form>
      </Modal>
    </>
  );
}

export function LossModal({ items, stations }: { items: ItemOpt[]; stations: StationOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordLossOrOut,
    { ok: false }
  );

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <AlertTriangle className="h-4 w-4" /> Lost / given out
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record lost or handed-out stock">
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>Type</span>
            <select name="type" required className={inputCls} defaultValue="">
              <option value="" disabled>Select type…</option>
              <option value="LOST">Lost / damaged</option>
              <option value="OUT">Given out (consumed)</option>
              <option value="ADJUSTMENT">Stock-take adjustment (−)</option>
            </select>
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Item</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Station</span>
            <StationSelect name="fromStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Quantity</span>
            <input name="quantity" type="number" min={1} required className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>Reason (required)</span>
            <textarea name="reason" rows={2} required className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record" />
        </form>
      </Modal>
    </>
  );
}

export function StockOps({
  items,
  stations,
  users,
  openIssues,
}: {
  items: ItemOpt[];
  stations: StationOpt[];
  users: UserOpt[];
  openIssues: OpenIssueRow[];
}) {
  if (!stations.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> No stations yet
        </p>
        <p className="mt-1">
          Create a region and at least one station under <b>Store → Locations</b> before
          recording stock movements.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PurchaseModal items={items} stations={stations} users={users} />
      <IssueModal items={items} stations={stations} users={users} />
      <ReturnModal stations={stations} openIssues={openIssues} />
      <LossModal items={items} stations={stations} />
    </div>
  );
}



