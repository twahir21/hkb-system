"use client";

import { useMemo, useState } from "react";
import { Button, Badge, DataTable, statusTone, type Column } from "@/components/ui";
import { Phone, GraduationCap } from "lucide-react";
import type { JobApplicationRow } from "@/features/jobs/queries/jobs";
import { JobApplicationDetailModal } from "./JobApplicationDetailModal";
import { enumLabel, t } from "@/lib/i18n";

const STATUS_FILTERS = [
  "ALL",
  "NEW",
  "IN_REVIEW",
  "SHORTLISTED",
  "HIRED",
  "REJECTED",
] as const;

export function JobApplicationsView({
  applications,
  canManage,
}: {
  applications: JobApplicationRow[];
  canManage: boolean;
}) {
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [selected, setSelected] = useState<JobApplicationRow | null>(null);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? applications
        : applications.filter((r) => r.status === statusFilter),
    [applications, statusFilter]
  );

  const columns: Column<JobApplicationRow>[] = [
    {
      key: "name",
      header: t.jobs.applicant,
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.fullName}</p>
          <p className="text-xs text-slate-400">
            {new Date(r.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
      ),
    },
    {
      key: "phone",
      header: t.common.phone,
      cell: (r) => (
        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <Phone className="h-3 w-3 text-slate-400" />
          {r.phone}
        </p>
      ),
    },
    {
      key: "profile",
      header: t.jobs.ageTraining,
      cell: (r) => (
        <div className="text-xs text-slate-600">
          <p>
            {r.age} {t.jobs.yrs} · {r.gender === "MALE" ? t.user.male : t.user.female}
          </p>
          <p className="flex items-center gap-1 text-slate-400">
            <GraduationCap className="h-3 w-3" /> {r.training ?? "—"} ·{" "}
            {r.educationLevel}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: t.common.status,
      cell: (r) => <Badge tone={statusTone(r.status)}>{enumLabel(r.status)}</Badge>,
    },
    {
      key: "action",
      header: "",
      cell: (r) => (
        <Button variant="secondary" size="sm" onClick={() => setSelected(r)}>
          {t.common.view}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
              (statusFilter === s
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
            }
          >
            {s === "ALL" ? t.common.all : enumLabel(s)}
          </button>
        ))}
        <p className="ml-auto text-sm font-medium text-slate-500">
          {filtered.length} application{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        empty={t.jobs.empty}
      />

      <JobApplicationDetailModal
        key={selected?.id ?? "none"}
        application={selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
      />
    </div>
  );
}
