"use client";

import { useState } from "react";
import { UserPlus, Pencil, Upload } from "lucide-react";
import { Button, Modal, DataTable, Badge, type Column } from "@/components/ui";
import type { GuardRow } from "@/features/hr/queries/guards";
import type { ClientOption, RegionOption, StationOption } from "./GuardForm";
import { GuardForm } from "./GuardForm";
import { BulkGuardModal } from "./BulkGuardModal";

type Supervisor = { id: string; name: string; role: string };

export function GuardManager({
  guards,
  supervisors,
  regions,
  stations,
  clients,
}: {
  guards: GuardRow[];
  supervisors: Supervisor[];
  regions: RegionOption[];
  stations: StationOption[];
  clients: ClientOption[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<GuardRow | null>(null);

  const filtered = guards.filter(
    (g) =>
      !q ||
      g.fullName.toLowerCase().includes(q.toLowerCase()) ||
      g.employeeId.toLowerCase().includes(q.toLowerCase()),
  );

  const columns: Column<GuardRow>[] = [
    {
      key: "guard",
      header: "Guard",
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.fullName}</p>
          <p className="font-mono text-xs text-slate-400">{r.employeeId}</p>
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      cell: (r) => <span className="text-slate-600">{r.age}</span>,
    },
    {
      key: "contact",
      header: "Contact",
      cell: (r) => (
        <div className="text-xs text-slate-600">
          <p>{r.phone}</p>
          <p className="text-slate-400">{r.email}</p>
        </div>
      ),
    },
    {
      key: "locations",
      header: "Locations",
      cell: (r) => (
        <div className="text-xs text-slate-600">
          <p>
            <span className="text-slate-400">Work:</span> {r.workLocation}
            {!r.stationId && (
              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                Unassigned site
              </span>
            )}
          </p>
          <p className="text-slate-400">
            Region: {r.regionName ?? "—"} · Home: {r.homeLocation}
          </p>
        </div>
      ),
    },
    {
      key: "kin",
      header: "Next of kin",
      cell: (r) => (
        <div className="text-xs text-slate-600">
          <p className="font-medium">{r.kinName}</p>
          <p className="text-slate-400">
            {r.kinRelation} · {r.kinPhone}
          </p>
        </div>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (r) =>
        r.clientName ? (
          <Badge tone="brand">{r.clientName}</Badge>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      cell: (r) =>
        r.supervisorName ? (
          <Badge tone="brand">{r.supervisorName}</Badge>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <button
          onClick={() => {
            setEditing(r);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guards…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" /> Bulk Import (CSV)
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" /> Add guard
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        empty="No guards match your search."
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit — ${editing.fullName}` : "Register a new guard"}
        wide
      >
        <GuardForm
          key={editing?.id ?? "new"}
          supervisors={supervisors}
          regions={regions}
          stations={stations}
          clients={clients}
          editing={editing}
          onDone={() => setOpen(false)}
        />
      </Modal>

      <BulkGuardModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
