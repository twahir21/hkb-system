"use client";

import { useState, useTransition, useRef } from "react";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { bulkImportUsers, type BulkImportResult } from "@/app/actions/users.actions";

export function BulkUserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setResult(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const res = await bulkImportUsers(formData);
        setResult(res);
      } catch {
        setResult({
          ok: false,
          total: 0,
          imported: 0,
          failed: 0,
          errors: [],
          error: "An unexpected error occurred during CSV import.",
        });
      }
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Register Users via CSV" wide>
      <div className="space-y-5">
        {/* Instructions Box */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-50/50 p-4 text-xs text-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-brand-800">
              CSV Format Instructions for Super Admin
            </span>
            <a
              href="/sample-users.csv"
              download="sample-users.csv"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-bold text-white shadow-sm transition hover:bg-brand-500"
            >
              <Download className="h-3.5 w-3.5" /> Download Sample CSV
            </a>
          </div>

          <p className="leading-relaxed text-slate-600">
            Ensure your CSV file contains the following columns in the first row (header):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-white p-3 rounded-lg border border-brand-200">
            <div>
              <span className="font-bold text-slate-900">fullName:</span> e.g. John Doe
            </div>
            <div>
              <span className="font-bold text-slate-900">email:</span> e.g. john@hkb.co
            </div>
            <div>
              <span className="font-bold text-slate-900">username:</span> e.g. jdoe
            </div>
            <div>
              <span className="font-bold text-slate-900">password:</span> Min. 6 characters
            </div>
            <div className="sm:col-span-2">
              <span className="font-bold text-slate-900">role:</span> Must be one of:{" "}
              <span className="text-brand-700 font-semibold">
                SUPER_ADMIN, SENIOR_SUPERVISOR, SUPERVISOR, HR, BURSAR, GUARD
              </span>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
              Select CSV File
            </label>
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-brand-500 hover:bg-brand-50/20">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                required
                disabled={isPending}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setResult(null);
                  }
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <FileSpreadsheet className="h-10 w-10 text-brand-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                {file ? file.name : "Click or drag & drop CSV file here"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — ready to upload`
                  : "Supported file format: .csv (UTF-8)"}
              </p>
            </div>
          </div>

          {/* Results Reporting */}
          {result && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              {result.error ? (
                <div className="flex items-start gap-2.5 text-rose-700 text-sm">
                  <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  <div>{result.error}</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900">
                      Import Results: {result.imported} of {result.total} users registered
                    </span>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-lg bg-amber-50 p-3 border border-amber-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        {result.errors.length} row(s) could not be imported:
                      </div>
                      <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-amber-900 divide-y divide-amber-200/60">
                        {result.errors.map((err, i) => (
                          <li key={i} className="pt-1 first:pt-0">
                            <span className="font-mono font-bold">Row {err.row}</span> ({err.identifier}):{" "}
                            <span className="text-rose-700">{err.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose} type="button">
              {result ? "Close" : "Cancel"}
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !file}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing Users…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload &amp; Register Users
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
