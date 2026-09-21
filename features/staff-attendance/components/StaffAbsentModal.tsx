"use client";

import { useActionState, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileCheck } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import {
  markStaffAttendance,
  uploadStaffSickNote,
} from "@/features/staff-attendance/actions/staff-attendance.actions";

type Category = "SICK" | "PERMITTED_REASON" | "NOT_PERMITTED";

const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: "SICK", label: "Sick", hint: "Medical leave with doctor's note" },
  {
    value: "PERMITTED_REASON",
    label: "Permitted",
    hint: "Funeral / approved leave / personal",
  },
  {
    value: "NOT_PERMITTED",
    label: "Not Permitted",
    hint: "Unauthorized absence / payroll deduction",
  },
];

export function StaffAbsentModal({
  userId,
  userName,
  date,
  currentCategory,
  currentReason,
  currentAllowedDays,
  currentDocumentUrl,
}: {
  userId: string;
  userName: string;
  date: string;
  currentCategory?: Category | null;
  currentReason?: string | null;
  currentAllowedDays?: number | null;
  currentDocumentUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>(currentCategory || "SICK");
  const [allowedDays, setAllowedDays] = useState<number>(currentAllowedDays || 1);
  const [reason, setReason] = useState<string>(currentReason || "");
  const [documentUrl, setDocumentUrl] = useState<string>(currentDocumentUrl || "");
  const [file, setFile] = useState<File | null>(null);

  const [state, formAction, pending] = useActionState(markStaffAttendance, {
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
      const res = await uploadStaffSickNote({ ok: false }, fd);
      if (!res.ok) {
        setUploadError(res.error || "Upload failed.");
      } else if (res.url) {
        setDocumentUrl(res.url);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload document.",
      );
    } finally {
      setUploadPending(false);
    }
  };

  const close = () => {
    setOpen(false);
    setFile(null);
    setUploadError(null);
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200"
      >
        Absent
      </Button>

      <Modal open={open} onClose={close} title={`Mark Absent — ${userName}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="status" value="ABSENT" />
          <input type="hidden" name="absenceCategory" value={category} />
          {documentUrl && (
            <input type="hidden" name="documentUrl" value={documentUrl} />
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Absence Category
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const selected = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (selected
                        ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                        : "border-slate-200 bg-white hover:bg-slate-50")
                    }
                  >
                    <p
                      className={
                        "text-xs font-bold " +
                        (selected ? "text-rose-900" : "text-slate-800")
                      }
                    >
                      {c.label}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                      {c.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {category === "PERMITTED_REASON" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Allowed Days
              </label>
              <input
                type="number"
                name="allowedDays"
                min={1}
                max={365}
                value={allowedDays}
                onChange={(e) =>
                  setAllowedDays(Math.max(1, Number(e.target.value) || 1))
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
              Absence Reason / Notes
            </label>
            <textarea
              name="reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Doctor appointment, family emergency, approved annual leave..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {category === "SICK" && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Medical Document / Sick Note (Optional)
              </label>
              {documentUrl ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 border border-emerald-200">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">Document attached</span>
                  </div>
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 underline hover:text-emerald-900 font-semibold"
                  >
                    View
                  </a>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold hover:file:bg-slate-300"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleUpload}
                    disabled={!file || uploadPending}
                    className="shrink-0"
                  >
                    <UploadCloud className="h-3.5 w-3.5 mr-1" />
                    {uploadPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
              {uploadError && (
                <p className="text-xs text-rose-600">{uploadError}</p>
              )}
            </div>
          )}

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {state.ok && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{state.message || "Absence recorded."}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={close}>
              Cancel
            </Button>

            <Button
              variant="danger"
              type="submit"
              disabled={pending}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
            >
              {pending ? "Saving..." : "Confirm Absence"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
