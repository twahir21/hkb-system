"use client";

import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
import {
  createClient,
  updateClient,
  type ActionState,
} from "@/features/hr/actions/clients.actions";

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

export function ClientForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createClient, {
    ok: false,
  });

  return (
    <Card title="Add client" subtitle="A company guards are posted under (e.g. MOFAT, ZURI)">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelSpanCls}>Name</span>
          <input name="name" required className={inputCls} placeholder="e.g. MOFAT" />
        </label>
        <label className="block">
          <span className={labelSpanCls}>Description (optional)</span>
          <input name="description" className={inputCls} placeholder="e.g. Salt factory — Mbagala" />
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add client"}
        </Button>
      </form>
    </Card>
  );
}

export function ClientActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateClient, {
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
