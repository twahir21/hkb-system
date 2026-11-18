"use client";

import { t } from "@/lib/i18n";
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
        {t.common.close}
      </Button>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t.common.saving : label}
      </Button>
    </div>
  );
}

function BusinessSelect({ businesses }: { businesses: BusinessOpt[] }) {
  return (
    <select name="businessId" required className={inputCls} defaultValue="">
      <option value="" disabled>
        {t.office.selectBusiness}
      </option>
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name} — {b.stock} {b.unit} {t.office.onHand}
        </option>
      ))}
    </select>
  );
}

function DateField() {
  return (
    <label className="block">
      <span className={labelSpanCls}>{t.common.date}</span>
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
        <PackagePlus className="h-4 w-4" /> {t.office.restock}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.office.restockTitle}>
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>{t.office.business}</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>{t.office.qty}</span>
              <input name="quantity" type="number" min="0.01" step="0.01" required className={inputCls} />
            </label>
            <label className="block">
              <span className={labelSpanCls}>{t.office.unitCostTzs}</span>
              <input name="unitCost" type="number" min="1" step="1" required className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>{t.office.supplierNote}</span>
            <input name="description" required maxLength={500} className={inputCls} />
          </label>
          <DateField />
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.office.recordRestock} />
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
        <ShoppingCart className="h-4 w-4" /> {t.office.recordSale}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.office.saleTitle}>
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>{t.office.business}</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>{t.office.qty}</span>
              <input name="quantity" type="number" min="0.01" step="0.01" required className={inputCls} />
            </label>
            <label className="block">
              <span className={labelSpanCls}>{t.office.unitPriceTzs}</span>
              <input name="unitPrice" type="number" min="1" step="1" required className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelSpanCls}>{t.office.saleType}</span>
            <select
              name="saleType"
              required
              className={inputCls}
              value={saleType}
              onChange={(e) => setSaleType(e.target.value)}
            >
              <option value="CASH">{t.office.cashSale}</option>
              <option value="CREDIT_GUARD">{t.office.creditSale}</option>
            </select>
          </label>
          {isCredit && (
            <label className="block">
              <span className={labelSpanCls}>{t.office.guardCredit}</span>
              <select name="guardId" required className={inputCls} defaultValue="">
                <option value="" disabled>
                  {t.transfer.selectGuard}
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
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.office.recordSale} />
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
        <Receipt className="h-4 w-4" /> {t.office.expense}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.office.expenseTitle}>
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className={labelSpanCls}>{t.office.business}</span>
            <BusinessSelect businesses={businesses} />
          </label>
          <label className="block">
            <span className={labelSpanCls}>{t.store.category}</span>
            <select name="category" required className={inputCls} defaultValue="TRANSPORT">
              <option value="TRANSPORT">{t.office.transport}</option>
              <option value="OTHER">{t.credit.types.OTHER}</option>
            </select>
          </label>
          <label className="block">
            <span className={labelSpanCls}>{t.common.description}</span>
            <input name="description" required maxLength={500} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelSpanCls}>{t.credit.amountTzs}</span>
              <input name="amount" type="number" min="1" step="1" required className={inputCls} />
            </label>
            <DateField />
          </div>
          <Feedback state={state} />
          <SubmitRow pending={pending} onClose={() => setOpen(false)} label={t.office.recordExpense} />
        </form>
      </Modal>
    </>
  );
}

