"use client";

import { useActionState, useState } from "react";
import { HandCoins, Plus, Ban } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  recordCredit,
  settleCredits,
  writeOffCredit,
  type ActionState,
} from "@/features/office/actions/credit.actions";
import type { GuardOption } from "@/features/office/queries/credit";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export const CREDIT_TYPE_LABELS: Record<string, string> = {
  FISH: "Fish",
  MAIZE_FLOUR: "Maize Flour",
  MEDICAL: "Medical Treatment",
  OTHER: "Other",
};

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

/** Office modal: lend goods / register a medical treatment on a guard's account. */
export function RecordCreditModal({ guards }: { guards: GuardOption[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("OTHER");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordCredit, {
    ok: false,
  });

  const isGoods = type === "FISH" || type === "MAIZE_FLOUR";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Record debt
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record guard debt (credit)">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>Guard</span>
            <select name="guardId" required className={inputCls} defaultValue="">
              <option value="" disabled>
                Select guard…
              </option>
              {guards.map((g) => (
                <option key={g.guardId} value={g.guardId}>
                  {g.guardName} ({g.employeeId}){g.outstandingAmount > 0 ? ` — owes ${g.outstandingAmount.toLocaleString()} TZS` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelSpanCls}>Type</span>
            <select
              name="type"
              required
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(CREDIT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>Quantity{isGoods ? "" : " (optional)"}</span>
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                required={isGoods}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelSpanCls}>Amount (TZS)</span>
              <input name="amount" type="number" min="1" step="1" required className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>Description</span>
            <input
              name="description"
              required
              maxLength={500}
              placeholder={isGoods ? "e.g. 2 kg maize flour" : "e.g. clinic visit + medicine"}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Date</span>
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Notes (optional)</span>
            <textarea name="notes" rows={2} className={inputCls} />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record debt" />
        </form>
      </Modal>
    </>
  );
}

/** Month-end: deduct outstanding entries from the guard's salary. */
export function SettleEntryForm({
  creditIds,
  defaultMonth,
  label = "Deduct",
  variant = "primary",
}: {
  creditIds: string[];
  defaultMonth: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(settleCredits, {
    ok: false,
  });

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      {creditIds.map((id) => (
        <input key={id} type="hidden" name="creditIds" value={id} />
      ))}
      <input type="hidden" name="deductionMonth" value={defaultMonth} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        <HandCoins className="h-4 w-4" />
        {pending ? "Deducting…" : label}
      </Button>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      {state.ok && state.message && <p className="text-xs text-emerald-700">{state.message}</p>}
    </form>
  );
}

/** Write off an outstanding debt with a mandatory reason. */
export function WriteOffForm({ creditId }: { creditId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(writeOffCredit, {
    ok: false,
  });

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" /> Write off
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Write off debt">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="creditId" value={creditId} />
          <label className="block">
            <span className={labelSpanCls}>Reason (required)</span>
            <textarea
              name="notes"
              rows={3}
              required
              minLength={3}
              placeholder="e.g. Office agreed to cover the treatment"
              className={inputCls}
            />
          </label>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Write off" />
        </form>
      </Modal>
    </>
  );
}

