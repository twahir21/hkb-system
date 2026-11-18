"use client";

import { enumLabel, t } from "@/lib/i18n";
import { useActionState, useState, useTransition } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Modal, statusTone } from "@/components/ui";
import type { JobApplicationRow } from "@/features/jobs/queries/jobs";
import {
  deleteJobApplication,
  updateJobApplication,
  getDocumentDownloadUrl,
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

/**
 * Fetches a fresh presigned S3 URL on every click and opens it in a new tab.
 * The browser never holds a raw (unauthenticated) storage URL.
 */
function DocLink({ label, storageUrl }: { label: string; storageUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(storageUrl);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <li>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        {label}
      </button>
      {error && <p className="mt-0.5 px-2.5 text-xs text-rose-600">{error}</p>}
    </li>
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
    { label: "Hati ya afya njema (hiari)", url: application.healthUrl },
    { label: "Hati ya tabia njema (hiari)", url: application.conductUrl },
    {
      label: "Mdhamini 1 — Barua ya serikali ya mtaa (makazi na utambulisho wa ndugu)",
      url: application.mdhamini1LocalGovUrl,
    },
    { label: "Mdhamini 1 — Copy ya kitambulisho (NIDA, kura, pasipoti au leseni ya udereva)", url: application.mdhamini1NidaUrl },
    { label: "Mdhamini 1 — Barua ya kumdhamini muomba kazi", url: application.mdhamini1SponsorUrl },
    {
      label: "Mdhamini 2 — Barua ya serikali ya mtaa (makazi na utambulisho wa ndugu)",
      url: application.mdhamini2LocalGovUrl,
    },
    { label: "Mdhamini 2 — Copy ya kitambulisho (NIDA, kura, pasipoti au leseni ya udereva)", url: application.mdhamini2NidaUrl },
    { label: "Mdhamini 2 — Barua ya kumdhamini muomba kazi", url: application.mdhamini2SponsorUrl },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t.jobs.application} — ${application.fullName}`}
    >
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label={t.common.phone} value={application.phone} />
          <Detail label={t.common.email} value={application.email || "—"} />
          <Detail label={t.jobs.ageGender} value={`${application.age} · ${application.gender === "MALE" ? t.user.male : t.user.female}`} />
          <Detail label={t.jobs.residence} value={application.residence} />
          <Detail label={t.jobs.education} value={application.educationLevel} />
          <Detail label={t.jobs.training} value={application.training || "—"} />
          <Detail
            label={t.cov.received}
            value={new Date(application.createdAt).toLocaleString("en-GB")}
          />
          <Detail label={t.common.status} value={<Badge tone={statusTone(application.status)}>{enumLabel(application.status)}</Badge>} />
          <Detail label={t.jobs.handledBy} value={application.handledByName || "—"} />
        </dl>

        {application.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.jobs.applicantNotes}
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
              {application.notes}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.jobs.documents}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {/* Legacy / optional documents come back empty ("" or null) —
                skip them rather than render a dead link. */}
            {documents.filter((doc) => doc.url).map((doc) => (
              <DocLink key={doc.label} label={doc.label} storageUrl={doc.url} />
            ))}
          </ul>
        </div>

        {application.internalNotes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.cov.internalNotes}
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
                  {t.common.status}
                </span>
                <select
                  name="status"
                  defaultValue={application.status}
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
                  defaultValue={application.internalNotes ?? ""}
                  placeholder={t.jobs.notesPlaceholder}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                {confirmDelete ? (
                  <span className="text-xs font-medium text-rose-600">
                    {t.jobs.confirmHint}
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
              {updateState.error && (
                <p className="text-xs text-rose-600">{updateState.error}</p>
              )}
            </form>

            {confirmDelete && (
              <form action={deleteAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={application.id} />
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
            {t.jobs.readOnly}
          </p>
        )}
      </div>
    </Modal>
  );
}
