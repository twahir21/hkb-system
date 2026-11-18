"use client";

import { ArrowLeftRight } from "lucide-react";
import { Badge, DataTable, statusTone, type Column } from "@/components/ui";
import type { TransferRow } from "@/features/hr/queries/transfers";
import { RequestTransferModal } from "./RequestModal";
import { ReviewCell } from "./ReviewCell";
import { enumLabel, t } from "@/lib/i18n";

type SupervisorOpt = { id: string; name: string; role: string };
type GuardOpt = { id: string; name: string; employeeId: string };

export function TransfersView({
  transfers,
  supervisors,
  guards,
  canRequest,
  canApprove,
  currentUserId,
}: {
  transfers: TransferRow[];
  supervisors: SupervisorOpt[];
  guards: GuardOpt[];
  canRequest: boolean;
  canApprove: boolean;
  currentUserId: string;
}) {
  const columns: Column<TransferRow>[] = [
    {
      key: "guard",
      header: t.records.guard,
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.guardName}</p>
          <p className="font-mono text-xs text-slate-400">{r.employeeId}</p>
        </div>
      ),
    },
    {
      key: "route",
      header: t.store.fromTo,
      cell: (r) => (
        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <span>{r.fromSupervisor}</span>
          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-medium">{r.toSupervisor}</span>
        </p>
      ),
    },
    {
      key: "reason",
      header: t.common.reason,
      cell: (r) => <span className="text-slate-600">{r.reason}</span>,
    },
    {
      key: "status",
      header: t.common.status,
      cell: (r) => <Badge tone={statusTone(r.status)}>{enumLabel(r.status)}</Badge>,
    },
    {
      key: "meta",
      header: t.transfer.requested,
      cell: (r) => (
        <div className="text-xs text-slate-500">
          <p>{t.store.by} {r.requestedBy}</p>
          <p>{new Date(r.createdAt).toLocaleDateString("en-GB")}</p>
          {r.reviewerNotes && (
            <p className="text-slate-400">{t.transfer.note}: {r.reviewerNotes}</p>
          )}
        </div>
      ),
    },
  ];

  if (canApprove) {
    columns.push({
      key: "action",
      header: t.dash.review,
      cell: (r) =>
        r.status === "PENDING" ? (
          <ReviewCell requestId={r.id} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">
          {transfers.length} {t.transfer.requests}
        </p>
        {canRequest && (
          <RequestTransferModal
            guards={guards}
            supervisors={supervisors}
            currentUserId={currentUserId}
          />
        )}
      </div>
      <DataTable
        columns={columns}
        rows={transfers}
        empty={t.transfer.empty}
      />
    </div>
  );
}
