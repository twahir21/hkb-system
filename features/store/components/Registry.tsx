"use client";

import { t } from "@/lib/i18n";
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
    <Card title={t.storeForms.addItem} subtitle={t.storeForms.addItemSub}>
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>{t.common.name}</span>
          <input name="name" required className={inputCls} placeholder={t.storeForms.itemPlaceholder} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelSpanCls}>{t.store.unit}</span>
            <input name="unit" className={inputCls} placeholder="pcs" defaultValue="pcs" />
          </label>
          <label className="block">
            <span className={labelSpanCls}>{t.store.category}</span>
            <input name="category" className={inputCls} placeholder={t.storeForms.categoryPlaceholder} />
          </label>
        </div>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.storeForms.addItemBtn}
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
        {isActive ? t.clients.deactivate : t.clients.activate}
      </Button>
    </form>
  );
}

type BranchOption = { id: string; name: string; isHq: boolean };

function BranchOptions({ branches }: { branches: BranchOption[] }) {
  return (
    <>
      <option value="">— {t.user.noBranch} —</option>
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
    <Card title={t.storeForms.addRegion} subtitle={t.storeForms.addRegionSub}>
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>{t.common.name}</span>
          <input name="name" required className={inputCls} placeholder={t.storeForms.regionPlaceholder} />
        </label>
        <label className="block">
          <span className={labelSpanCls}>{t.common.description}</span>
          <input name="description" className={inputCls} />
        </label>
        <label className="block">
          <span className={labelSpanCls}>{t.common.branch}</span>
          <select name="branchId" className={inputCls} defaultValue="">
            <BranchOptions branches={branches} />
          </select>
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.storeForms.addRegion}
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
          {pending ? "…" : t.common.save}
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
      title={t.storeForms.regionBranches}
      subtitle={
        unassigned > 0
          ? t.storeForms.regionsNoBranch.replace("{n}", String(unassigned))
          : t.storeForms.regionsBranchHint
      }
    >
      <div className="space-y-3">
        {regions.map((r) => (
          <RegionBranchRow key={r.id} region={r} branches={branches} />
        ))}
        {regions.length === 0 && <p className="text-sm text-slate-400">{t.storeForms.noRegions}</p>}
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
    <Card title={t.storeForms.addStation} subtitle={t.storeForms.addStationSub}>
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>{t.common.name}</span>
          <input name="name" required className={inputCls} placeholder={t.storeForms.stationPlaceholder} />
        </label>
        <label className="block">
          <span className={labelSpanCls}>{t.common.region}</span>
          <select name="regionId" required className={inputCls} defaultValue="">
            <option value="" disabled>{t.guard.selectRegion}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelSpanCls}>{t.storeForms.supervisorOptional}</span>
          <select name="supervisorId" className={inputCls} defaultValue="">
            <option value="">—</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.storeForms.addStation}
        </Button>
      </form>
    </Card>
  );
}
