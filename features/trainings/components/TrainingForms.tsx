"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import { cancelTraining, createTraining } from "@/features/trainings/actions/trainings.actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type Branch = { id: string; name: string; isHq: boolean };

/** `fixedBranchId`: branch-limited organiser (Office Assistant) — no "all branches" option. */
export function TrainingForm({
  branches,
  today,
  fixedBranchId,
}: {
  branches: Branch[];
  today: string;
  fixedBranchId?: string;
}) {
  const T = t.trainings;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createTraining, { ok: false });

  return (
    <Card title={T.new}>
      <form action={formAction} className="space-y-3" key={state.ok ? state.message : "training"}>
        <label className="block">
          <span className={labelCls}>{T.trainingTitle}</span>
          <input name="title" required minLength={3} maxLength={200} placeholder={T.titlePlaceholder} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{T.trainer}</span>
          <input name="trainer" required minLength={2} maxLength={200} placeholder={T.trainerPlaceholder} className={inputCls} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{T.start}</span>
            <input name="startDate" type="date" required min={today} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{T.end}</span>
            <input name="endDate" type="date" min={today} className={inputCls} />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>{T.venue}</span>
          <input name="venue" required minLength={2} maxLength={255} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{T.branch}</span>
          <select name="branchId" defaultValue={fixedBranchId ?? ""} className={inputCls}>
            {!fixedBranchId && <option value="">{T.allBranches}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.isHq ? " (HQ)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{T.description}</span>
          <textarea name="description" rows={3} maxLength={5000} className={inputCls} />
        </label>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? T.saving : T.save}
        </Button>
      </form>
    </Card>
  );
}

export function CancelTrainingButton({ id }: { id: string }) {
  const T = t.trainings;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(cancelTraining, { ok: false });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(T.confirmCancel)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {T.cancel}
      </Button>
      {state.error && <p className="text-[11px] text-rose-600">{state.error}</p>}
    </form>
  );
}
