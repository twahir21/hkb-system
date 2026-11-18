"use client";

import { t } from "@/lib/i18n";
import { useActionState, useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import {
  markAttendance,
  uploadSickNote,
} from "@/features/attendance/actions/attendance.actions";
import type { ShiftType } from "@/lib/db/schema";

type Category = "SICK" | "PERMITTED_REASON" | "NOT_PERMITTED";

const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: "SICK", label: t.status.SICK, hint: t.att.sickHint },
  {
    value: "PERMITTED_REASON",
    label: t.status.PERMITTED_REASON,
    hint: t.att.permittedHint,
  },
  {
    value: "NOT_PERMITTED",
    label: t.status.NOT_PERMITTED,
    hint: t.att.notPermittedHint,
  },
];

export function AbsentModal({
  guardId,
  guardName,
  date,
  shift,
}: {
  guardId: string;
  guardName: string;
  date: string;
  shift: ShiftType;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("SICK");
  const [documentUrl, setDocumentUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [state, formAction, pending] = useActionState(markAttendance, {
    ok: false,
  });
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploadError(null);
    setUploadPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadSickNote({ ok: false }, fd);
      if (!res.ok) {
        setUploadError(res.error || t.att.uploadFailed);
      } else if (res.url) {
        setDocumentUrl(res.url);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : t.att.uploadFailed,
      );
    } finally {
      setUploadPending(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDocumentUrl("");
    setFile(null);
    setUploadError(null);
  };

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        {t.charts.absent}
      </Button>

      <Modal open={open} onClose={close} title={`${t.att.markAbsent} — ${guardName}`}>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="guardId" value={guardId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="shift" value={shift} />
          <input type="hidden" name="status" value="ABSENT" />
          <input type="hidden" name="absenceCategory" value={category} />
          {documentUrl && (
            <input type="hidden" name="documentUrl" value={documentUrl} />
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.gmd.absenceCategory}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={
                    "rounded-xl border p-3 text-left transition " +
                    (category === c.value
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                      : "border-slate-200 hover:bg-slate-50")
                  }
                >
                  <p className="text-sm font-bold text-slate-800">{c.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{c.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {category === "SICK" && (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <p className="text-xs font-semibold text-rose-700">
                {t.att.doctorNote}
              </p>

              {documentUrl ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> {t.att.docAttached}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentUrl("");
                      setFile(null);
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    {t.common.clear}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    name="file"
                    accept="application/pdf,image/*"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setUploadError(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadPending || !file}
                    onClick={handleUpload}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {uploadPending ? t.documents.uploading : t.att.uploadDoc}
                  </Button>
                </div>
              )}
              {uploadError && (
                <p className="text-xs text-rose-600">{uploadError}</p>
              )}
            </div>
          )}
          <div>
            <label
              htmlFor="allowedDays"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.att.allowedDays}{" "}
              {category === "PERMITTED_REASON" ? t.att.required : t.att.optional}
            </label>
            <input
              type="number"
              name="allowedDays"
              min={1}
              max={365}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label
              htmlFor="reason"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.common.notes}
            </label>
            <textarea
              name="reason"
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder={t.att.notesPlaceholder}
            />
          </div>

          {state.error && (
            <p className="text-sm text-rose-600">{state.error}</p>
          )}
          {state.ok && state.message && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={close} type="button">
              {t.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t.common.saving : t.att.saveAbsence}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
