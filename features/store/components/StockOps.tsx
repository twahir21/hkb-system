"use client";

import { t } from "@/lib/i18n";
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
        {t.common.close}
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t.common.saving : label}
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
        {t.ops.selectStation}
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
      <option value="" disabled>{t.ops.selectItem}</option>
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
        <PackagePlus className="h-4 w-4" /> {t.ops.buy}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.ops.buyTitle}>
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.store.item}</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.destination}</span>
            <StationSelect name="toStationId" stations={stations} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span className={labelSpanCls}>{t.office.qty}</span>
              <input name="quantity" type="number" min={1} required className={inputCls} />
            </label>
            <label className={labelCls}>
              <span className={labelSpanCls}>{t.office.unitCostTzs}</span>
              <input name="unitCost" type="number" min={0} step="0.01" className={inputCls} />
            </label>
          </div>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.reference}</span>
            <input name="reference" className={inputCls} placeholder={t.ops.referencePlaceholder} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.store.receivedBy}</span>
            <select name="receivedById" className={inputCls} defaultValue="">
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.ops.recordPurchase} />
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
        <PackageMinus className="h-4 w-4" /> {t.ops.give}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.ops.giveTitle}>
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.store.item}</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.fromStation}</span>
            <StationSelect name="fromStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.toStation}</span>
            <StationSelect name="toStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.office.qty}</span>
            <input name="quantity" type="number" min={1} required className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.store.receivedBy}</span>
            <select name="receivedById" className={inputCls} defaultValue="">
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.noteOptional}</span>
            <input name="reason" className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.ops.issue} />
        </form>
      </Modal>
    </>
  );
}

export function ReturnModal({ stations, openIssues }: { stations: StationOpt[]; openIssues: OpenIssueRow[] }) {
  const [open, setOpen] = useState(false);
  // The inner form component keeps its own state. Because <Modal> unmounts its
  // children while closed, the active stock selection and prior submission
  // feedback are fully reset every time the modal opens — so switching between
  // store elements never carries over a stale selection.
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Undo2 className="h-4 w-4" /> {t.ops.return}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.ops.returnTitle}>
        <ReturnModalInner stations={stations} openIssues={openIssues} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ReturnModalInner({
  stations,
  openIssues,
  onClose,
}: {
  stations: StationOpt[];
  openIssues: OpenIssueRow[];
  onClose: () => void;
}) {
  const [issueId, setIssueId] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    returnStock,
    { ok: false }
  );
  const selected = openIssues.find((i) => i.movementId === issueId);

  return (
    <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.originalIssue}</span>
            <select
              name="returnedMovementId"
              required
              className={inputCls}
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
            >
              <option value="" disabled>{t.ops.selectIssued}</option>
              {openIssues.map((i) => (
                <option key={i.movementId} value={i.movementId}>
                  {i.itemName} — {i.stationName || "—"} ({i.outstanding} {i.unit} {t.ops.outstanding})
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="itemId" value={selected?.itemId ?? ""} />
          <input type="hidden" name="fromStationId" value={selected?.stationId ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              <span className={labelSpanCls}>{t.office.qty}</span>
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
              <span className={labelSpanCls}>{t.ops.returnTo}</span>
              <select name="toStationId" className={inputCls} defaultValue="">
                <option value="">{t.ops.mainStore}</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.regionName}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.ops.noteOptional}</span>
            <input name="reason" className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={onClose} label={t.ops.recordReturn} />
        </form>
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
        <AlertTriangle className="h-4 w-4" /> {t.ops.lost}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.ops.lostTitle}>
        <form action={formAction} className="space-y-4">
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.common.type}</span>
            <select name="type" required className={inputCls} defaultValue="">
              <option value="" disabled>{t.ops.selectType}</option>
              <option value="LOST">{t.ops.lostDamaged}</option>
              <option value="OUT">{t.ops.consumed}</option>
              <option value="ADJUSTMENT">{t.ops.adjustment}</option>
            </select>
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.store.item}</span>
            <ItemSelect items={items} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.common.station}</span>
            <StationSelect name="fromStationId" stations={stations} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.office.qty}</span>
            <input name="quantity" type="number" min={1} required className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelSpanCls}>{t.credit.reasonRequired}</span>
            <textarea name="reason" rows={2} required className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.ops.record} />
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
          <Plus className="h-4 w-4" /> {t.ops.noStations}
        </p>
        <p className="mt-1">
          {t.ops.noStationsA} <b>{t.ops.noStationsB}</b> {t.ops.noStationsC}
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



