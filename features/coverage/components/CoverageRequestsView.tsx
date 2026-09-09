"use client";

import { useMemo, useState } from "react";
import { Button, Badge, DataTable, statusTone, type Column } from "@/components/ui";
import { Mail, Phone } from "lucide-react";
import type { CoverageRequestRow } from "@/features/coverage/queries/coverage";
import { CoverageRequestDetailModal } from "./CoverageRequestDetailModal";

const STATUS_FILTERS = [
  "ALL",
  "NEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export function CoverageRequestsView({
  requests,
  canManage,
}: {
  requests: CoverageRequestRow[];
  canManage: boolean;
}) {
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [selected, setSelected] = useState<CoverageRequestRow | null>(null);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter]
  );

  const columns: Column<CoverageRequestRow>[] = [
    {
      key: "name",
      header: "Contact",
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
      key: "contact",
      header: "Email / Phone",
      cell: (r) => (
        <div className="text-xs text-slate-600">
          <p className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-slate-400" />
            {r.email}
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-slate-400" />
            {r.phone}
          </p>
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      cell: (r) => <span className="text-slate-700">{r.service}</span>,
    },
    {
      key: "message",
      header: "Message",
      cell: (r) => (
        <span className="line-clamp-2 block max-w-xs text-xs text-slate-500">
          {r.message}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
    },
    {
      key: "action",
      header: "",
      cell: (r) => (
        <Button variant="secondary" size="sm" onClick={() => setSelected(r)}>
          View
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
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
        <p className="ml-auto text-sm font-medium text-slate-500">
          {filtered.length} request{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        empty="No coverage requests yet."
      />

      <CoverageRequestDetailModal
        key={selected?.id ?? "none"}
        request={selected}
        onClose={() => setSelected(null)}
        canManage={canManage}
      />
    </div>
  );
}