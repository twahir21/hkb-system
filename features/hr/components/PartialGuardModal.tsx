"use client";

import { useState, useTransition, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  MapPin,
  Building2,
} from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  partialBulkImportGuards,
  type BulkImportResult,
} from "@/features/hr/actions/guards.actions";
import type { RegionOption, StationOption, ClientOption } from "./GuardForm";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400";

export function PartialGuardModal({
  open,
  onClose,
  regions,
  stations,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  regions: RegionOption[];
  stations: StationOption[];
  clients: ClientOption[];
}) {
  const [regionId, setRegionId] = useState("");
  const [stationId, setStationId] = useState("");
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const regionStations = stations.filter((s) => s.regionId === regionId);

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setValidationError(null);
    setRegionId("");
    setStationId("");
    setClientId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!regionId) {
      setValidationError("Please select a work region.");
      return;
    }
    if (!stationId) {
      setValidationError("Please select a work station.");
      return;
    }
    if (!clientId) {
      setValidationError("Please select a client (company).");
      return;
    }
    if (!file) {
      setValidationError("Please select a CSV file to upload.");
      return;
    }

    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("regionId", regionId);
    formData.append("stationId", stationId);
    formData.append("clientId", clientId);

    startTransition(async () => {
      try {
        const res = await partialBulkImportGuards(formData);
        setResult(res);
      } catch {
        setResult({
          ok: false,
          total: 0,
          imported: 0,
          failed: 0,
          errors: [],
          error: "An unexpected error occurred during partial CSV import.",
        });
      }
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Partial Guard Import (Batch CSV)" wide>
      <div className="space-y-5">
        {/* Instructions & Context Box */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-50/50 p-4 text-xs text-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold uppercase tracking-wider text-brand-800">
                Phase 1: Quick Batch Onboarding
              </span>
              <p className="mt-0.5 text-slate-600">
                Upload a simple CSV containing only <span className="font-semibold text-slate-900">full name</span> and{" "}
                <span className="font-semibold text-slate-900">guard phone number</span>.
              </p>
            </div>
            <a
              href="/partial_guard_reg.csv"
              download="partial_guard_reg.csv"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 font-bold text-white shadow-sm transition hover:bg-brand-500"
            >
              <Download className="h-3.5 w-3.5" /> Download Sample CSV
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-600 bg-white/80 p-3 rounded-lg border border-brand-200/70">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand-600" /> Batch Tiering
              </span>
              <p>
                All guards in this batch will be assigned to the chosen Region, Station, and Client.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-brand-600" /> Auto-Generated Email
              </span>
              <p>
                Emails are randomly generated as <code className="text-brand-700 font-bold">firstname###@hkb.co</code> with collision avoidance.
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" /> Phase 2 Ready
              </span>
              <p>
                Initial dummy data (ID, Next of Kin, Age, Date) is populated to prevent breaks until Phase 2 full registration.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Work Region, Station, Client Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Work Region <span className="text-rose-500">*</span>
              </span>
              <select
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setStationId("");
                }}
                disabled={isPending}
                required
                className={inputCls}
              >
                <option value="">Select region…</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Work Site (Station) <span className="text-rose-500">*</span>
              </span>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                disabled={!regionId || isPending}
                required
                className={inputCls}
              >
                <option value="">
                  {regionId ? "Select site…" : "Select a region first"}
                </option>
                {regionStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {regionId && regionStations.length === 0 && (
                <span className="mt-1 block text-[11px] text-amber-600">
                  No stations registered in this region.
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Client (Company) <span className="text-rose-500">*</span>
              </span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isPending}
                required
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isActive === false ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* File Upload Drop Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
              Select Partial CSV File <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-brand-500 hover:bg-brand-50/20">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                required
                disabled={isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setResult(null);
                  setValidationError(null);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <FileSpreadsheet className="h-10 w-10 text-brand-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                {file ? file.name : "Click or drag & drop partial CSV file here"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB — ready to upload`
                  : "Supported columns: fullName, phone (.csv UTF-8)"}
              </p>
            </div>
          </div>

          {/* Validation Warning */}
          {validationError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{validationError}</span>
            </div>
          )}

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
                      Import Results: {result.imported} of {result.total} guard(s) registered
                    </span>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-lg bg-amber-50 p-3 border border-amber-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        {result.errors.length} notice(s) during import:
                      </div>
                      <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-amber-900 divide-y divide-amber-200/60">
                        {result.errors.map((err, i) => (
                          <li key={i} className="pt-1 first:pt-0">
                            {err.row > 0 ? (
                              <>
                                <span className="font-mono font-bold">
                                  Row {err.row}
                                </span>{" "}
                                ({err.identifier}):{" "}
                              </>
                            ) : (
                              <span className="font-mono font-bold">
                                {err.identifier}:{" "}
                              </span>
                            )}
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
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !file || !regionId || !stationId || !clientId}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing Batch…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload &amp; Register Batch
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
