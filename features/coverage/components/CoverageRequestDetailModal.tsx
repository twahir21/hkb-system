"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Modal, statusTone } from "@/components/ui";
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
    <Modal open onClose={onClose} title={`Coverage request — ${request.fullName}`}>
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="text-slate-800">{request.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
            <dd className="text-slate-800">{request.phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service</dt>
            <dd className="text-slate-800">{request.service}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source</dt>
            <dd className="text-slate-800">{request.source}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Received</dt>
            <dd className="text-slate-800">
              {new Date(request.createdAt).toLocaleString("en-GB")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
            <dd>
              <Badge tone={statusTone(request.status)}>{request.status}</Badge>
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
            {request.message}
          </p>
        </div>

        {request.internalNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Internal notes
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
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={request.status}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Internal notes
                </span>
                <textarea
                  name="internalNotes"
                  rows={3}
                  defaultValue={request.internalNotes ?? ""}
                  placeholder="Staff-only notes (quotes, follow-ups, assignment plans…)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                {confirmDelete ? (
                  <span className="text-xs font-medium text-rose-600">
                    Click “Confirm delete” below to remove this request permanently.
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
                <Button type="submit" disabled={updatePending}>
                  {updatePending ? "Saving…" : "Save changes"}
                </Button>
              </div>
              {updateState.error && <p className="text-xs text-rose-600">{updateState.error}</p>}
            </form>

            {confirmDelete && (
              <form action={deleteAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={request.id} />
                <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                  {deletePending ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
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
            Read-only — only the Super Admin can update or delete requests.
          </p>
        )}
      </div>
    </Modal>
  );
}