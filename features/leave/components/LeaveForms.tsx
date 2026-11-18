"use client";

import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { LeaveType } from "@/lib/db/schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import { decideLeave, requestLeave } from "@/features/leave/actions/leave.actions";
import { leaveDays } from "@/features/leave/rules";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const LEAVE_TYPES = Object.keys(t.leave.types) as LeaveType[];

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
    </>
  );
}

export function LeaveRequestForm({
  selfId,
  employees,
}: {
  selfId: string;
  /** Empty → user can only request for themselves. */
  employees: { id: string; fullName: string }[];
}) {
  const L = t.leave;
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await requestLeave(prev, fd);
    if (res.ok) {
      setStart("");
      setEnd("");
    }
    return res;
  }, { ok: false });
  const days = start && end && end >= start ? leaveDays(start, end) : 0;

  return (
    <Card title={L.request}>
      <form action={formAction} className="space-y-3">
        {employees.length > 0 && (
          <label className="block">
            <span className={labelCls}>{L.forEmployee}</span>
            <select name="userId" defaultValue={selfId} className={inputCls}>
              <option value={selfId}>{L.myself}</option>
              {employees
                .filter((e) => e.id !== selfId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className={labelCls}>{L.type}</span>
          <select name="type" defaultValue="ANNUAL" className={inputCls}>
            {LEAVE_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {L.types[lt]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>{L.from}</span>
            <input name="startDate" type="date" required value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{L.to}</span>
            <input name="endDate" type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </label>
        </div>
        {days > 0 && (
          <p className="text-xs text-slate-500">
            {L.days}: <span className="font-semibold text-slate-800">{days}</span>
          </p>
        )}
        <label className="block">
          <span className={labelCls}>{L.reason}</span>
          <textarea name="reason" rows={2} className={inputCls} />
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? L.sending : L.submit}
        </Button>
      </form>
    </Card>
  );
}

export function LeaveDecision({
  id,
  canApprove,
  canCancel,
}: {
  id: string;
  canApprove: boolean;
  canCancel: boolean;
}) {
  const L = t.leave;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(decideLeave, { ok: false });
  if (!canApprove && !canCancel) return null;
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      {canApprove && (
        <input name="notes" placeholder={L.notes} className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs" />
      )}
      <div className="flex gap-1">
        {canApprove && (
          <>
            <Button size="sm" variant="success" name="decision" value="APPROVED" disabled={pending}>
              {L.approve}
            </Button>
            <Button size="sm" variant="danger" name="decision" value="REJECTED" disabled={pending}>
              {L.reject}
            </Button>
          </>
        )}
        {canCancel && (
          <Button size="sm" variant="ghost" name="decision" value="CANCELLED" disabled={pending}>
            {L.cancel}
          </Button>
        )}
      </div>
      {state.error && <p className="text-[11px] text-rose-600">{state.error}</p>}
    </form>
  );
}
