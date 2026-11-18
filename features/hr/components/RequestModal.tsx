"use client";

import { t } from "@/lib/i18n";
import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  submitTransfer,
  type ActionState,
} from "@/features/hr/actions/transfers.actions";

type SupervisorOpt = { id: string; name: string; role: string };
type GuardOpt = { id: string; name: string; employeeId: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function RequestTransferModal({
  guards,
  supervisors,
  currentUserId,
}: {
  guards: GuardOpt[];
  supervisors: SupervisorOpt[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitTransfer,
    {
      ok: false,
    },
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t.transfer.request}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.transfer.requestTitle}
      >
        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.records.guard}
            </span>
            <select
              name="guardId"
              required
              className={inputCls}
              defaultValue=""
            >
              <option value="" disabled>
                {t.transfer.selectGuard}
              </option>
              {guards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.employeeId})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.transfer.toSupervisor}
            </span>
            <select
              name="toSupervisorId"
              required
              className={inputCls}
              defaultValue=""
            >
              <option value="" disabled>
                {t.transfer.selectSupervisor}
              </option>
              {supervisors
                .filter((s) => s.id !== currentUserId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({t.roles[s.role as keyof typeof t.roles] ?? s.role})
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.common.reason}
            </span>
            <textarea
              name="reason"
              rows={3}
              required
              className={inputCls}
              placeholder={t.transfer.reasonPlaceholder}
            />
          </label>

          {state.error && (
            <p className="text-sm text-rose-600">{state.error}</p>
          )}
          {state.ok && state.message && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
              type="button"
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t.common.submitting : t.transfer.submit}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
