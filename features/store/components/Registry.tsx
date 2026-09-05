"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { createItem, updateItem, type ActionState } from "@/features/store/actions/items.actions";
import {
  createRegion,
  createStation,
} from "@/features/store/actions/locations.actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && (
        <p className="text-sm font-medium text-emerald-700">{state.message}</p>
      )}
    </>
  );
}

export function ItemForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createItem, {
    ok: false,
  });

  return (
    <Card title="Add store item" subtitle="Items that can be stocked at stations">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>Name</span>
          <input name="name" required className={inputCls} placeholder="e.g. Rubber Boots" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelSpanCls}>Unit</span>
            <input name="unit" className={inputCls} placeholder="pcs" defaultValue="pcs" />
          </label>
          <label className="block">
            <span className={labelSpanCls}>Category</span>
            <input name="category" className={inputCls} placeholder="e.g. Uniform" />
          </label>
        </div>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add item"}
        </Button>
      </form>
    </Card>
  );
}

export function ItemActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateItem, {
    ok: false,
  });

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} title={state.error ?? ""}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}

export function RegionForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createRegion, {
    ok: false,
  });

  return (
    <Card title="Add region" subtitle="Top-level grouping for stations">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>Name</span>
          <input name="name" required className={inputCls} placeholder="e.g. Dar es Salaam" />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Description</span>
          <input name="description" className={inputCls} />
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add region"}
        </Button>
      </form>
    </Card>
  );
}

export function StationForm({
  regions,
  supervisors,
}: {
  regions: { id: string; name: string }[];
  supervisors: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createStation, {
    ok: false,
  });

  return (
    <Card title="Add station" subtitle="A physical outpost inside a region">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>Name</span>
          <input name="name" required className={inputCls} placeholder="e.g. Post 12" />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Region</span>
          <select name="regionId" required className={inputCls} defaultValue="">
            <option value="" disabled>Select region…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelSpanCls}>Supervisor (optional)</span>
          <select name="supervisorId" className={inputCls} defaultValue="">
            <option value="">—</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add station"}
        </Button>
      </form>
    </Card>
  );
}
