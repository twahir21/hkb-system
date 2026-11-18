"use client";

import { enumLabel, t } from "@/lib/i18n";
import { useMemo, useState } from "react";
import {
  FileDown,
  ExternalLink,
  Calendar,
  Filter,
  Users,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
} from "lucide-react";

type SupervisorOpt = { id: string; name: string; role: string };
type ClientOpt = { id: string; name: string };
type RegionOpt = { id: string; name: string };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition";
const labelCls = "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600";

export function GuardPayrollExportBuilder({
  supervisors,
  clients,
  defaultMonth,
}: {
  supervisors: SupervisorOpt[];
  regions?: RegionOpt[];
  clients: ClientOpt[];
  defaultMonth: string;
}) {
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState(defaultMonth);
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [includeZeroActivity, setIncludeZeroActivity] = useState(false);
  const [includeDetails, setIncludeDetails] = useState(false);

  const url = useMemo(() => {
    const p = new URLSearchParams({ format: "pdf" });
    if (mode === "month") {
      p.set("month", month);
    } else {
      p.set("startDate", startDate);
      p.set("endDate", endDate);
    }
    if (clientId) p.set("clientId", clientId);
    if (supervisorId) p.set("supervisorId", supervisorId);
    if (status !== "ALL") p.set("status", status);
    if (includeZeroActivity) p.set("includeZeroActivity", "true");
    if (includeDetails) p.set("includeDetails", "true");
    return `/api/guards/pdf?${p.toString()}`;
  }, [
    mode,
    month,
    startDate,
    endDate,
    clientId,
    supervisorId,
    status,
    includeZeroActivity,
    includeDetails,
  ]);

  const selectedClient = clients.find((c) => c.id === clientId)?.name ?? t.pex.allClientsChunked;
  const selectedSupervisor =
    supervisors.find((s) => s.id === supervisorId)?.name ?? t.msv.allSupervisors;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {t.pex.badge}
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t.pex.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t.pex.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <ExternalLink className="h-4 w-4" /> {t.pex.previewTab}
            </a>
            <a
              href={url}
              download
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <FileDown className="h-4 w-4 text-amber-300" /> {t.pex.exportPdf}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Time Period */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-600" />
                <h4 className="font-semibold text-slate-900 text-base">{t.pex.period}</h4>
              </div>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("month")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    mode === "month"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.pex.byMonth}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    mode === "range"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.pex.customRange}
                </button>
              </div>
            </div>

            {mode === "month" ? (
              <div>
                <label className={labelCls}>{t.pex.targetMonth}</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {t.pex.monthHint}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.rb.startDate}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t.rb.endDate}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: Scope & Location Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="h-4 w-4 text-brand-600" />
              <h4 className="font-semibold text-slate-900 text-base">{t.pex.scope}</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  <Building2 className="h-3 w-3" /> {t.pex.clientAccount}
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t.pex.allClientsGrouped}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {t.pex.allClientsHint}
                </p>
              </div>

              <div>
                <label className={labelCls}>
                  <Users className="h-3 w-3" /> {t.reportsPage.supervisor}
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t.msv.allSupervisors}</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={labelCls}>{t.pex.statusFilter}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ALL" | "ACTIVE" | "DISABLED")}
                  className={inputCls}
                >
                  <option value="ALL">{t.pex.statusAll}</option>
                  <option value="ACTIVE">{t.pex.statusActive}</option>
                  <option value="DISABLED">{t.pex.statusDisabled}</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {t.pex.disabledHint}
                </p>
              </div>
            </div>
          </div>

          {/* Card: Output Options */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="h-4 w-4 text-brand-600" />
              <h4 className="font-semibold text-slate-900 text-base">{t.pex.options}</h4>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeZeroActivity}
                  onChange={(e) => setIncludeZeroActivity(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">
                    {t.pex.zeroActivity}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.pex.zeroActivityHint}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">
                    {t.pex.dossiers}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.pex.dossiersHint}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Col: Live Summary & Direct Actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t.pex.summary}
            </h4>

            <div className="space-y-3 divide-y divide-slate-100 text-xs">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.pex.periodLabel}:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {mode === "month" ? month : `${startDate} → ${endDate}`}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.pex.clientScope}:</span>
                <span className="font-semibold text-slate-900">{selectedClient}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.reportsPage.supervisor}:</span>
                <span className="font-semibold text-slate-900">{selectedSupervisor}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.pex.guardStatus}:</span>
                <span className="font-semibold text-slate-900">
                  {status === "ALL" ? t.pex.activeDisabled : enumLabel(status)}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.pex.zeroActivityLabel}:</span>
                <span className="font-semibold text-slate-900">
                  {includeZeroActivity ? t.pex.included : t.pex.excluded}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-medium">{t.pex.fullDossiers}:</span>
                <span className="font-semibold text-slate-900">
                  {includeDetails ? t.pex.yesIncluded : t.pex.noTable}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow hover:bg-brand-500 transition"
              >
                <ExternalLink className="h-4 w-4" /> {t.pex.openPreview}
              </a>
              <a
                href={url}
                download
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <FileDown className="h-4 w-4 text-brand-600" /> {t.pex.downloadFile}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-800 space-y-2">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>📌</span> {t.pex.noteTitle}
            </p>
            <p className="leading-relaxed">
              {t.pex.noteBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
