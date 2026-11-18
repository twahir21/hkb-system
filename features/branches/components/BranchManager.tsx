"use client";

import { t } from "@/lib/i18n";
import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import { createBranch, setHqBranch } from "@/features/branches/actions/branches.actions";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function BranchForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createBranch, {
    ok: false,
  });

  return (
    <Card title={t.branchesPage.add} subtitle={t.branchesPage.addSub}>
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.common.name}
          </span>
          <input name="name" required className={inputCls} placeholder={t.branchesPage.namePlaceholder} />
        </label>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && state.message && (
          <p className="text-sm font-medium text-emerald-700">{state.message}</p>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.branchesPage.add}
        </Button>
      </form>
    </Card>
  );
}

export function MakeHqButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setHqBranch, {
    ok: false,
  });
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} title={state.error ?? ""}>
        {t.branchesPage.makeHq}
      </Button>
    </form>
  );
}
