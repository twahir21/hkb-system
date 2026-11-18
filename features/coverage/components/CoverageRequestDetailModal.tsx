"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Modal, statusTone } from "@/components/ui";
import { enumLabel, t } from "@/lib/i18n";
import type { CoverageRequestRow } from "@/features/coverage/queries/coverage";
import {
  deleteCoverageRequest,
  updateCoverageRequest,
  type ActionState,
} from "@/features/coverage/actions/coverage.actions";

const STATUSES = ["NEW", "IN_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"] as const;

export function CoverageRequestDetailModal({
  request,
  onClose,
  canManage,
}: {
  request: CoverageRequestRow | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState<ActionState, FormData>(
    updateCoverageRequest,
    { ok: false }
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteCoverageRequest,
    { ok: false }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!request) return null;

  const saved = updateState.ok || deleteState.ok;

  return (
    <Modal open onClose={onClose} title={`${t.cov.request} — ${request.fullName}`}>
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.common.email}</dt>
            <dd className="text-slate-800">{request.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.common.phone}</dt>
            <dd className="text-slate-800">{request.phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.cov.service}</dt>
            <dd className="text-slate-800">{request.service}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.cov.source}</dt>
            <dd className="text-slate-800">{request.source}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.cov.received}</dt>
            <dd className="text-slate-800">
              {new Date(request.createdAt).toLocaleString("en-GB")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.common.status}</dt>
            <dd>
              <Badge tone={statusTone(request.status)}>{enumLabel(request.status)}</Badge>
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.cov.message}</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
            {request.message}
          </p>
        </div>

        {request.internalNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.cov.internalNotes}
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-amber-800">
              {request.internalNotes}
            </p>
          </div>
        )}

        {canManage && !saved && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <form action={updateAction} className="space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.common.status}
                </span>
                <select
                  name="status"
                  defaultValue={request.status}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {enumLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.cov.internalNotes}
                </span>
                <textarea
                  name="internalNotes"
                  rows={3}
                  defaultValue={request.internalNotes ?? ""}
                  placeholder={t.cov.notesPlaceholder}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                {confirmDelete ? (
                  <span className="text-xs font-medium text-rose-600">
                    {t.cov.confirmHint}
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t.common.delete}
                  </Button>
                )}
                <Button type="submit" disabled={updatePending}>
                  {updatePending ? t.common.saving : t.cov.saveChanges}
                </Button>
              </div>
              {updateState.error && <p className="text-xs text-rose-600">{updateState.error}</p>}
            </form>

            {confirmDelete && (
              <form action={deleteAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={request.id} />
                <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                  {deletePending ? t.common.deleting : t.cov.confirmDelete}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t.common.cancel}
                </Button>
                {deleteState.error && (
                  <p className="text-xs text-rose-600">{deleteState.error}</p>
                )}
              </form>
            )}
          </div>
        )}

        {saved && (
          <p className="border-t border-slate-100 pt-3 text-sm font-medium text-emerald-700">
            {updateState.message ?? deleteState.message}
          </p>
        )}

        {!canManage && (
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            {t.cov.readOnly}
          </p>
        )}
      </div>
    </Modal>
  );
}