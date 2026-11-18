"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCheck,
  RotateCcw,
  FileText,
  FileCheck,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { Button, Badge, Modal } from "@/components/ui";
import { ROLE_LABELS, ROLE_TONES, STAFF_ROLES } from "@/lib/auth/rbac";
import type { Role } from "@/lib/db/schema";
import type {
  StaffSheetRow,
  StaffHistoryRow,
} from "@/features/staff-attendance/queries/staff-attendance";
import {
  markStaffAttendance,
  markAllStaffPresent,
  clearStaffAttendance,
  signOutStaff,
} from "@/features/staff-attendance/actions/staff-attendance.actions";
import { StaffLateModal } from "./StaffLateModal";
import { StaffAbsentModal } from "./StaffAbsentModal";
import { StaffEditTimeModal } from "./StaffEditTimeModal";
import { formatDate } from "@/lib/utils";
import { StaffAttendanceCharts } from "./charts/StaffAttendanceCharts";
import { BarChart3, FileDown } from "lucide-react";
import { enumLabel, t } from "@/lib/i18n";

type ViewTab = "sheet" | "analytics" | "history";



export function StaffAttendanceView({
  date,
  rows,
  historyLogs,
  canRecord = true,
  canEdit = true,
  canEditTime = false,
}: {
  date: string;
  rows: StaffSheetRow[];
  historyLogs: StaffHistoryRow[];
  canRecord?: boolean;
  canEdit?: boolean;
  /** Super Admin only — edit recorded times & sign staff out */
  canEditTime?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ViewTab>("sheet");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // History filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyRoleFilter, setHistoryRoleFilter] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Quick batch dialog
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTime, setBatchTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );

  // Date navigation handlers
  const handleDateChange = (newDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    handleDateChange(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    handleDateChange(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    handleDateChange(new Date().toISOString().slice(0, 10));
  };

  // Metrics for sheet
  const metrics = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.log?.status === "PRESENT").length;
    const late = rows.filter((r) => r.log?.status === "LATE").length;
    const absent = rows.filter((r) => r.log?.status === "ABSENT").length;
    const unmarked = rows.filter((r) => !r.log).length;
    const maleCount = rows.filter((r) => r.gender === "MALE").length;
    const femaleCount = rows.filter((r) => r.gender === "FEMALE").length;

    return {
      total,
      present,
      late,
      absent,
      unmarked,
      maleCount,
      femaleCount,
      presentPct: total ? Math.round(((present + late) / total) * 100) : 0,
    };
  }, [rows]);

  // Filtered sheet rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchQuery =
        !search ||
        r.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.username && r.username.toLowerCase().includes(search.toLowerCase()));

      const matchRole = !roleFilter || r.role === roleFilter;

      const logStatus = r.log?.status ?? "UNMARKED";
      const matchStatus = !statusFilter || logStatus === statusFilter;

      return matchQuery && matchRole && matchStatus;
    });
  }, [rows, search, roleFilter, statusFilter]);

  // Filtered history rows
  const filteredHistory = useMemo(() => {
    return historyLogs.filter((r) => {
      const matchQuery =
        !historySearch ||
        r.staffName.toLowerCase().includes(historySearch.toLowerCase()) ||
        r.staffEmail.toLowerCase().includes(historySearch.toLowerCase());

      const matchRole = !historyRoleFilter || r.staffRole === historyRoleFilter;
      const matchStatus = !historyStatusFilter || r.status === historyStatusFilter;

      return matchQuery && matchRole && matchStatus;
    });
  }, [historyLogs, historySearch, historyRoleFilter, historyStatusFilter]);

  // Actions
  const handleMarkPresent = (userId: string, hasExistingLog: boolean) => {
    setActionError(null);
    setActionMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("date", date);
      fd.append("status", "PRESENT");
      // Only stamp the clock-in time on a fresh mark — re-marking must not
      // overwrite an already recorded time (only Super Admin may edit times).
      if (!hasExistingLog) {
        fd.append(
          "checkInTime",
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
      }
      const res = await markStaffAttendance({ ok: false }, fd);
      if (!res.ok) {
        setActionError(res.error || t.sa.markFailed);
      } else {
        setActionMessage(res.message || t.sa.markedPresent);
      }
    });
  };

  const handleClear = (userId: string, name: string) => {
    if (!confirm(t.sa.confirmClear.replace("{name}", name))) {
      return;
    }
    setActionError(null);
    setActionMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("date", date);
      const res = await clearStaffAttendance({ ok: false }, fd);
      if (!res.ok) {
        setActionError(res.error || t.sa.clearFailed);
      } else {
        setActionMessage(res.message || t.sa.cleared);
      }
    });
  };

  const handleSignOut = (userId: string) => {
    setActionError(null);
    setActionMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("date", date);
      // Stamped in the browser so the clock matches the user's timezone,
      // consistent with the check-in quick action.
      fd.append(
        "signOutTime",
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
      const res = await signOutStaff({ ok: false }, fd);
      if (!res.ok) {
        setActionError(res.error || t.sa.signOutFailed);
      } else {
        setActionMessage(res.message || t.sa.signedOut);
      }
    });
  };

  const handleBatchPresent = () => {
    setActionError(null);
    setActionMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("date", date);
      if (batchTime) fd.append("checkInTime", batchTime);
      const res = await markAllStaffPresent({ ok: false }, fd);
      setBatchModalOpen(false);
      if (!res.ok) {
        setActionError(res.error || t.sa.batchFailed);
      } else {
        setActionMessage(res.message || t.sa.batchDone);
      }
    });
  };

  const exportCSV = () => {
    const headers = [
      ...t.sa.csvHeaders,
    ];

    const dataRows = filteredHistory.map((h) => [
      h.date,
      `"${h.staffName.replace(/"/g, '""')}"`,
      h.staffEmail,
      h.staffRole,
      h.staffGender,
      h.status,
      h.checkInTime || "",
      h.checkOutTime || "",
      h.minutesLate || "",
      h.absenceCategory || "",
      h.allowedDays || "",
      `"${(h.reason || "").replace(/"/g, '""')}"`,
      `"${(h.recordedByName || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...dataRows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `hkb_staff_attendance_${date || "records"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleBadge = (role: Role) => (
    <Badge tone={ROLE_TONES[role] ?? "slate"}>{ROLE_LABELS[role] ?? role}</Badge>
  );



  return (
    <div className="space-y-6">
      {/* Toast alerts */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.nav.staffAttendance}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t.sa.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PDF Export Shortcut */}
          <a
            href={`/api/staff-attendance/pdf?date=${date}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center"
          >
            <Button
              variant="secondary"
              size="sm"
              className="h-9 px-3 text-xs font-semibold shadow-xs"
            >
              <FileDown className="h-4 w-4 mr-1.5 text-indigo-600" />
              {t.sa.downloadReport}
            </Button>
          </a>

          {/* Tab switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("sheet")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                (activeTab === "sheet"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              <Calendar className="h-3.5 w-3.5" />
              {t.sa.rollCall}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                (activeTab === "analytics"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {t.sa.analytics}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                (activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              <FileText className="h-3.5 w-3.5" />
              {t.sa.records}
            </button>
          </div>
        </div>
      </div>


      {activeTab === "sheet" && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.sa.totalStaff}
                </span>
                <Users className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {metrics.total}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {metrics.maleCount}{t.sa.m} · {metrics.femaleCount}{t.sa.f}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.gmd.present}
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-900">
                {metrics.present}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">
                {metrics.total
                  ? `${Math.round((metrics.present / metrics.total) * 100)}% ${t.sa.onTime}`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.charts.late}
                </span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-amber-900">
                {metrics.late}
              </p>
              <p className="mt-1 text-xs text-amber-600 font-medium">
                {metrics.total
                  ? `${Math.round((metrics.late / metrics.total) * 100)}% ${t.sa.delayed}`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.charts.absent}
                </span>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-rose-900">
                {metrics.absent}
              </p>
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {metrics.total
                  ? `${Math.round((metrics.absent / metrics.total) * 100)}% ${t.sa.absentPct}`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t.sa.unmarked}
                </span>
                <HelpCircle className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-700">
                {metrics.unmarked}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {metrics.unmarked === 0 ? t.sa.allRecorded : t.sa.pendingAction}
              </p>
            </div>
          </div>

          {/* Date Picker Bar & Action Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            {/* Date selector */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrevDay}
                className="h-9 px-2.5"
                title={t.sa.prevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextDay}
                className="h-9 px-2.5"
                title={t.sa.nextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>


              <Button
                variant="secondary"
                size="sm"
                onClick={handleToday}
                className="h-9 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {t.sa.today}
              </Button>

              <span className="ml-2 hidden text-xs font-medium text-slate-500 md:inline">
                {formatDate(date)}
              </span>
            </div>

            {/* Batch actions */}
            {canRecord && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setBatchModalOpen(true)}
                  disabled={metrics.unmarked === 0 || isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                  {t.sa.markAll}
                </Button>
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.sa.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">{t.user.allRoles}</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">{t.incidentsPage.allStatuses}</option>
                <option value="PRESENT">{t.status.PRESENT}</option>
                <option value="LATE">{t.status.LATE}</option>
                <option value="ABSENT">{t.status.ABSENT}</option>
                <option value="UNMARKED">{t.sa.unmarked}</option>
              </select>

              {(search || roleFilter || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("");
                    setStatusFilter("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  {t.sa.clearFilters}
                </Button>
              )}
            </div>
          </div>

          {/* Roll Call Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5">{t.sa.staffMember}</th>
                    <th className="px-4 py-3.5">{t.dash.role}</th>
                    <th className="px-4 py-3.5">{t.user.gender}</th>
                    <th className="px-4 py-3.5">{t.common.status}</th>
                    <th className="px-4 py-3.5">{t.sa.checkInDetails}</th>
                    <th className="px-4 py-3.5">{t.records.recordedBy}</th>
                    <th className="px-4 py-3.5 text-right">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-400"
                      >
                        {t.sa.noMatch}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((staff) => {
                      const log = staff.log;
                      return (
                        <tr
                          key={staff.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Staff Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                {staff.fullName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {staff.fullName}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {staff.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3">
                            {getRoleBadge(staff.role)}
                          </td>

                          {/* Gender */}
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-600">
                              {staff.gender === "FEMALE" ? t.user.female : t.user.male}
                            </span>
                          </td>

                          {/* Attendance Status */}
                          <td className="px-4 py-3">
                            {log ? (
                              log.status === "PRESENT" ? (
                                <Badge tone="emerald">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {enumLabel("PRESENT")}
                                </Badge>
                              ) : log.status === "LATE" ? (
                                <Badge tone="amber">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {enumLabel("LATE")} (+{log.minutesLate ?? 0}{t.myShift.minutes})
                                </Badge>
                              ) : (
                                <Badge tone="rose">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {enumLabel("ABSENT")} ({enumLabel(log.absenceCategory ?? "NOT_PERMITTED")})
                                </Badge>
                              )
                            ) : (
                              <Badge tone="slate">{enumLabel("NOT_MARKED")}</Badge>
                            )}
                          </td>

                          {/* Details / Check-in */}
                          <td className="px-4 py-3">
                            {log ? (
                              <div className="space-y-0.5">
                                {log.checkInTime && (
                                  <p className="font-medium text-slate-800">
                                    {t.sa.in}: {log.checkInTime}
                                  </p>
                                )}
                                {log.checkOutTime && (
                                  <p className="font-medium text-slate-800">
                                    {t.sa.out}: {log.checkOutTime}
                                  </p>
                                )}
                                {log.reason && (
                                  <p className="text-[11px] text-slate-500 italic truncate max-w-xs">
                                    &ldquo;{log.reason}&rdquo;
                                  </p>
                                )}
                                {log.documentUrl && (
                                  <a
                                    href={log.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                                  >
                                    <FileCheck className="h-3 w-3" />
                                    {t.sa.viewNote}
                                  </a>
                                )}
                                {!log.checkInTime && !log.checkOutTime && !log.reason && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Recorded By */}
                          <td className="px-4 py-3">
                            {log ? (
                              <div>
                                <p className="font-medium text-slate-700">
                                  {log.recordedByName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(log.updatedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            {canRecord && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handleMarkPresent(staff.id, !!log)}
                                  className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                                  {t.status.PRESENT}
                                </Button>

                                <StaffLateModal
                                  userId={staff.id}
                                  userName={staff.fullName}
                                  date={date}
                                  currentMinutesLate={log?.minutesLate}
                                  currentReason={log?.reason}
                                  currentCheckInTime={log?.checkInTime}
                                  canEditTime={canEditTime}
                                />

                                <StaffAbsentModal
                                  userId={staff.id}
                                  userName={staff.fullName}
                                  date={date}
                                  currentCategory={log?.absenceCategory}
                                  currentReason={log?.reason}
                                  currentAllowedDays={log?.allowedDays}
                                  currentDocumentUrl={log?.documentUrl}
                                />

                                {/* Super Admin only: edit recorded times */}
                                {canEditTime && log && (
                                  <StaffEditTimeModal
                                    key={`${staff.id}-${log.checkInTime ?? ""}-${log.checkOutTime ?? ""}`}
                                    userId={staff.id}
                                    userName={staff.fullName}
                                    date={date}
                                    currentCheckInTime={log.checkInTime}
                                    currentCheckOutTime={log.checkOutTime}
                                  />
                                )}

                                {/* Super Admin only: one-click sign-out */}
                                {canEditTime &&
                                  log &&
                                  log.status !== "ABSENT" &&
                                  !log.checkOutTime && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => handleSignOut(staff.id)}
                                      title={t.sa.signOutTitle}
                                      className="border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900"
                                    >
                                      <LogOut className="h-3.5 w-3.5 text-indigo-600 mr-1" />
                                      {t.sa.signOut}
                                    </Button>
                                  )}

                                {canEdit && log && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() =>
                                      handleClear(staff.id, staff.fullName)
                                    }
                                    title={t.sa.resetTitle}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Visual Analytics & Graphs Tab */}
      {activeTab === "analytics" && (
        <StaffAttendanceCharts
          rows={rows}
          historyLogs={historyLogs}
          selectedDate={date}
        />
      )}

      {/* History & Attendance Records Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.sa.searchHistory}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyRoleFilter}
                onChange={(e) => setHistoryRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">{t.user.allRoles}</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">{t.incidentsPage.allStatuses}</option>
                <option value="PRESENT">{t.status.PRESENT}</option>
                <option value="LATE">{t.status.LATE}</option>
                <option value="ABSENT">{t.status.ABSENT}</option>
              </select>

              <Button
                variant="secondary"
                size="sm"
                onClick={exportCSV}
                className="text-xs font-semibold h-9 px-3"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t.sa.exportCsv}
              </Button>

              <a
                href={`/api/staff-attendance/pdf?role=${encodeURIComponent(historyRoleFilter)}&status=${encodeURIComponent(historyStatusFilter)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs font-semibold h-9 px-3 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                  {t.pex.exportPdf}
                </Button>
              </a>
            </div>
          </div>


          {/* History Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5">{t.common.date}</th>
                    <th className="px-4 py-3.5">{t.sa.staffMember}</th>
                    <th className="px-4 py-3.5">{t.dash.role}</th>
                    <th className="px-4 py-3.5">{t.common.status}</th>
                    <th className="px-4 py-3.5">{t.sa.timeDetails}</th>
                    <th className="px-4 py-3.5">{t.sa.absenceNotes}</th>
                    <th className="px-4 py-3.5">{t.records.recordedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-400"
                      >
                        {t.sa.noHistory}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-slate-900">
                              {item.staffName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.staffEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getRoleBadge(item.staffRole)}
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "PRESENT" ? (
                            <Badge tone="emerald">{enumLabel("PRESENT")}</Badge>
                          ) : item.status === "LATE" ? (
                            <Badge tone="amber">
                              {enumLabel("LATE")} (+{item.minutesLate ?? 0}{t.myShift.minutes})
                            </Badge>
                          ) : (
                            <Badge tone="rose">
                              {enumLabel("ABSENT")} ({enumLabel(item.absenceCategory ?? "NOT_PERMITTED")})
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.checkInTime ? (
                            <span className="font-medium text-slate-800">
                              {item.checkInTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5 max-w-xs">
                            {item.checkInTime && (
                              <p className="font-medium text-slate-800">
                                {t.sa.in}: {item.checkInTime}
                              </p>
                            )}
                            {item.checkOutTime && (
                              <p className="font-medium text-slate-800">
                                {t.sa.out}: {item.checkOutTime}
                              </p>
                            )}
                            {item.reason && (
                              <p className="italic text-slate-600 truncate">
                                &ldquo;{item.reason}&rdquo;
                              </p>
                            )}
                            {item.allowedDays && (
                              <p className="text-[10px] text-slate-400">
                                {t.att.allowedDays}: {item.allowedDays}
                              </p>
                            )}
                            {item.documentUrl && (
                              <a
                                href={item.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                              >
                                <FileCheck className="h-3 w-3" />
                                {t.sa.viewDoc}
                              </a>
                            )}
                            {!item.reason && !item.documentUrl && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">
                            {item.recordedByName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batch Mark Present Modal */}
      <Modal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`${t.sa.batchTitle} — ${formatDate(date)}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t.sa.batchBodyA} <span className="font-bold text-slate-900">{metrics.unmarked}</span>{" "}
            {t.sa.batchBodyB} <span className="font-bold text-emerald-700">{t.status.PRESENT.toUpperCase()}</span>{" "}
            {t.sa.batchBodyC} {formatDate(date)}.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
              {t.sa.checkInOptional}
            </label>
            <input
              type="text"
              value={batchTime}
              onChange={(e) => setBatchTime(e.target.value)}
              placeholder={t.sa.batchPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setBatchModalOpen(false)}
            >
              {t.common.cancel}
            </Button>

            <Button
              variant="primary"
              type="button"
              disabled={isPending}
              onClick={handleBatchPresent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? t.sa.recording : t.sa.confirmBatch}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
