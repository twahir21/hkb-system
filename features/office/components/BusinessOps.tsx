"use client";

import { useActionState, useState } from "react";
import { PackagePlus, ShoppingCart, Receipt } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  restockBusiness,
  recordSale,
  recordExpense,
} from "@/features/office/actions/business.actions";
import type { ActionState } from "@/features/office/actions/credit.actions";
import type { BusinessWithStock } from "@/features/office/queries/business";
import type { GuardOption } from "@/features/office/queries/credit";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type BusinessOpt = Pick<BusinessWithStock, "id" | "name" | "unit" | "sellPrice" | "buyPrice" | "stock">;

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

function BusinessSelect({ businesses }: { businesses: BusinessOpt[] }) {
  return (
    <select name="businessId" required className={inputCls} defaultValue="">
      <option value="" disabled>
        Select business…
      </option>
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name} — {b.stock} {b.unit} on hand
        </option>
      ))}
    </select>
  );
}

function DateField() {
  return (
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
  );
}

/** Buy new stock for a business — recorded as a RESTOCK expense. */
export function RestockModal({ businesses }: { businesses: BusinessOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    restockBusiness,
    { ok: false }
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" /> Restock
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Restock a business">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>Business</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>Quantity</span>
              <input name="quantity" type="number" min="0.01" step="0.01" required className={inputCls} />
            </label>
            <label className="block">
              <span className={labelSpanCls}>Unit cost (TZS)</span>
              <input name="unitCost" type="number" min="1" step="1" required className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>Description (supplier / note)</span>
            <input name="description" required maxLength={500} className={inputCls} />
          </label>
          <DateField />
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record restock" />
        </form>
      </Modal>
    </>
  );
}

/** Record a sale — cash, or on credit to a guard (auto-creates the debt). */
export function SaleModal({
  businesses,
  guards,
}: {
  businesses: BusinessOpt[];
  guards: GuardOption[];
}) {
  const [open, setOpen] = useState(false);
  const [saleType, setSaleType] = useState("CASH");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(recordSale, {
    ok: false,
  });

  const isCredit = saleType === "CREDIT_GUARD";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ShoppingCart className="h-4 w-4" /> Record sale
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a sale">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>Business</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>Quantity</span>
              <input name="quantity" type="number" min="0.01" step="0.01" required className={inputCls} />
            </label>
            <label className="block">
              <span className={labelSpanCls}>Unit price (TZS)</span>
              <input name="unitPrice" type="number" min="1" step="1" required className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>Sale type</span>
            <select
              name="saleType"
              required
              className={inputCls}
              value={saleType}
              onChange={(e) => setSaleType(e.target.value)}
            >
              <option value="CASH">Cash sale</option>
              <option value="CREDIT_GUARD">On credit to a guard (deducted from salary)</option>
            </select>
          </label>
          {isCredit && (
            <label className="block">
              <span className={labelSpanCls}>Guard (buying on credit)</span>
              <select name="guardId" required className={inputCls} defaultValue="">
                <option value="" disabled>
                  Select guard…
                </option>
                {guards.map((g) => (
                  <option key={g.guardId} value={g.guardId}>
                    {g.guardName} ({g.employeeId})
                  </option>
                ))}
              </select>
            </label>
          )}
          <DateField />
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record sale" />
        </form>
      </Modal>
    </>
  );
}

/** Record a general expense (transport / other — restocks use the Restock button). */
export function ExpenseModal({ businesses }: { businesses: BusinessOpt[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordExpense,
    { ok: false }
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Receipt className="h-4 w-4" /> Expense
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record an expense">
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>Business</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Category</span>
            <select name="category" required className={inputCls} defaultValue="TRANSPORT">
              <option value="TRANSPORT">Transport</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            <span className={labelSpanCls}>Description</span>
            <input name="description" required maxLength={500} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>Amount (TZS)</span>
              <input name="amount" type="number" min="1" step="1" required className={inputCls} />
            </label>
            <DateField />
          </div>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label="Record expense" />
        </form>
      </Modal>
    </>
  );
}

