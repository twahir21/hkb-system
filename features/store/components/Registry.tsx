"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { createItem, updateItem, type ActionState } from "@/features/store/actions/items.actions";
import {
  createRegion,
  createStation,
  setRegionBranch,
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

type BranchOption = { id: string; name: string; isHq: boolean };

function BranchOptions({ branches }: { branches: BranchOption[] }) {
  return (
    <>
      <option value="">— No branch —</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
          {b.isHq ? " (HQ)" : ""}
        </option>
      ))}
    </>
  );
}

export function RegionForm({ branches }: { branches: BranchOption[] }) {
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
        <label className="block">
          <span className={labelSpanCls}>Branch</span>
          <select name="branchId" className={inputCls} defaultValue="">
            <BranchOptions branches={branches} />
          </select>
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add region"}
        </Button>
      </form>
    </Card>
  );
}

function RegionBranchRow({
  region,
  branches,
}: {
  region: { id: string; name: string; branchId: string | null };
  branches: BranchOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setRegionBranch, {
    ok: false,
  });

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="id" value={region.id} />
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 truncate text-sm font-medium text-slate-800" title={region.name}>
          {region.name}
        </span>
        <select
          name="branchId"
          className={inputCls}
          defaultValue={region.branchId ?? ""}
          key={region.branchId ?? ""}
        >
          <BranchOptions branches={branches} />
        </select>
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Choose which branch each region belongs to. Incidents in a region go to its branch. */
export function RegionBranchList({
  regions,
  branches,
}: {
  regions: { id: string; name: string; branchId: string | null }[];
  branches: BranchOption[];
}) {
  const unassigned = regions.filter((r) => !r.branchId).length;
  return (
    <Card
      title="Region branches"
      subtitle={
        unassigned > 0
          ? `${unassigned} region${unassigned === 1 ? "" : "s"} without a branch — incidents there use the reporter's branch`
          : "Incidents in a region go to its branch"
      }
    >
      <div className="space-y-3">
        {regions.map((r) => (
          <RegionBranchRow key={r.id} region={r} branches={branches} />
        ))}
        {regions.length === 0 && <p className="text-sm text-slate-400">No regions yet.</p>}
      </div>
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
