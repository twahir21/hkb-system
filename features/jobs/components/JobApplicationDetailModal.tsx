"use client";

import { useActionState, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Badge, Button, Modal, statusTone } from "@/components/ui";
import type { JobApplicationRow } from "@/features/jobs/queries/jobs";
import {
  deleteJobApplication,
  updateJobApplication,
  type ActionState,
} from "@/features/jobs/actions/jobs.actions";

const STATUSES = ["NEW", "IN_REVIEW", "SHORTLISTED", "HIRED", "REJECTED"] as const;

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

export function JobApplicationDetailModal({
  application,
  onClose,
  canManage,
}: {
  application: JobApplicationRow | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState<ActionState, FormData>(
    updateJobApplication,
    { ok: false }
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteJobApplication,
    { ok: false }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!application) return null;

  const saved = updateState.ok || deleteState.ok;

  const documents = [
    { label: "Barua ya maombi ya kazi", url: application.letterUrl },
    { label: "Barua ya utambulisho wa serikali za mitaa", url: application.localGovLetterUrl },
    { label: "Vyeti vya taaluma (hiari)", url: application.certificatesUrl ?? "" },
    { label: "CV (Wasifu wa muombaji)", url: application.cvUrl },
    { label: "Picha ya pasipoti (passport size)", url: application.passportUrl },
    { label: "Hati ya afya njema", url: application.healthUrl },
    { label: "Hati ya tabia njema", url: application.conductUrl },
    {
      label: "Mdhamini 1 — Barua ya serikali ya mtaa (makazi na utambulisho wa ndugu)",
      url: application.mdhamini1LocalGovUrl,
    },
    { label: "Mdhamini 1 — Copy ya NIDA au kitambulisho cha kura", url: application.mdhamini1NidaUrl },
    { label: "Mdhamini 1 — Barua ya kumdhamini muomba kazi", url: application.mdhamini1SponsorUrl },
    {
      label: "Mdhamini 2 — Barua ya serikali ya mtaa (makazi na utambulisho wa ndugu)",
      url: application.mdhamini2LocalGovUrl,
    },
    { label: "Mdhamini 2 — Copy ya NIDA au kitambulisho cha kura", url: application.mdhamini2NidaUrl },
    { label: "Mdhamini 2 — Barua ya kumdhamini muomba kazi", url: application.mdhamini2SponsorUrl },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={`Job application — ${application.fullName}`}
    >
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Phone" value={application.phone} />
          <Detail label="Email" value={application.email || "—"} />
          <Detail label="Age / Gender" value={`${application.age} · ${application.gender === "MALE" ? "Male" : "Female"}`} />
          <Detail label="Residence" value={application.residence} />
          <Detail label="Education" value={application.educationLevel} />
          <Detail label="Training" value={application.training || "—"} />
          <Detail
            label="Received"
            value={new Date(application.createdAt).toLocaleString("en-GB")}
          />
          <Detail label="Status" value={<Badge tone={statusTone(application.status)}>{application.status}</Badge>} />
          <Detail label="Handled by" value={application.handledByName || "—"} />
        </dl>

        {application.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Applicant notes
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
              {application.notes}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Viambatanisho (documents)
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {/* Legacy / optional documents come back empty ("" or null) —
                skip them rather than render a dead link. */}
            {documents.filter((doc) => doc.url).map((doc) => (
              <li key={doc.label}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {doc.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {application.internalNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Internal notes
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-amber-800">
              {application.internalNotes}
            </p>
          </div>
        )}

        {canManage && !saved && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <form action={updateAction} className="space-y-3">
              <input type="hidden" name="id" value={application.id} />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={application.status}
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
                  defaultValue={application.internalNotes ?? ""}
                  placeholder="Staff-only notes (interview date, trial shift, follow-ups…)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                {confirmDelete ? (
                  <span className="text-xs font-medium text-rose-600">
                    Click “Confirm delete” below to remove this application
                    permanently.
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
              {updateState.error && (
                <p className="text-xs text-rose-600">{updateState.error}</p>
              )}
            </form>

            {confirmDelete && (
              <form action={deleteAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={application.id} />
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
            Read-only — only HR or the Super Admin can update or delete
            applications.
          </p>
        )}
      </div>
    </Modal>
  );
}
