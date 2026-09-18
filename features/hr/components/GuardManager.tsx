"use client";

import { useState, useMemo } from "react";
import { UserPlus, Pencil, Upload, FileSpreadsheet, Search } from "lucide-react";
import { Button, Modal, DataTable, Badge, Pagination, type Column } from "@/components/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { GuardRow } from "@/features/hr/queries/guards";
import type { ClientOption, RegionOption, StationOption } from "./GuardForm";
import { GuardForm } from "./GuardForm";
import { BulkGuardModal } from "./BulkGuardModal";
import { PartialGuardModal } from "./PartialGuardModal";

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
  const debouncedQ = useDebounce(q, 300);
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [prevQ, setPrevQ] = useState(debouncedQ);

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [partialBulkOpen, setPartialBulkOpen] = useState(false);
  const [editing, setEditing] = useState<GuardRow | null>(null);

  const maleCount = useMemo(() => guards.filter((g) => g.gender === "MALE").length, [guards]);
  const femaleCount = useMemo(() => guards.filter((g) => g.gender === "FEMALE").length, [guards]);

  // Reset to page 1 whenever the debounced search query changes
  if (prevQ !== debouncedQ) {
    setPrevQ(debouncedQ);
    setPage(1);
  }

  const filtered = useMemo(() => {
    return guards.filter((g) => {
      const matchesQ =
        !debouncedQ ||
        g.fullName.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        g.employeeId.toLowerCase().includes(debouncedQ.toLowerCase());

      const matchesGender = !genderFilter || g.gender === genderFilter;

      return matchesQ && matchesGender;
    });
  }, [guards, debouncedQ, genderFilter]);

  const paginatedGuards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns: Column<GuardRow>[] = [
    {
      key: "guard",
      header: "Guard",
      cell: (r) => {
        const isPartial =
          r.employeeId.startsWith("HKB-P-") ||
          r.homeLocation?.toLowerCase() === "unknown" ||
          r.kinName?.toLowerCase() === "unknown";

        return (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-slate-800">{r.fullName}</p>
              {isPartial && (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Phase 1 (Partial)
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-slate-400">{r.employeeId}</p>
          </div>
        );
      },
    },
    {
      key: "gender",
      header: "Gender",
      cell: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.gender === "FEMALE"
              ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200"
              : "bg-sky-50 text-sky-700 border border-sky-200"
          }`}
        >
          {r.gender === "FEMALE" ? "Female" : "Male"}
        </span>
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
      {/* Stats and Gender Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Registered Guards</p>
            <p className="text-xl font-bold text-slate-900">{guards.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs">
            All
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-sky-700">Male Guards</p>
            <p className="text-xl font-bold text-sky-950">{maleCount}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
            {guards.length > 0 ? Math.round((maleCount / guards.length) * 100) : 0}%
          </span>
        </div>

        <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fuchsia-700">Female Guards</p>
            <p className="text-xl font-bold text-fuchsia-950">{femaleCount}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-fuchsia-100 px-2 py-1 text-xs font-semibold text-fuchsia-800">
            {guards.length > 0 ? Math.round((femaleCount / guards.length) * 100) : 0}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search guards by name or ID…"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male ({maleCount})</option>
            <option value="FEMALE">Female ({femaleCount})</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setPartialBulkOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 text-brand-600" /> Partial Import (CSV)
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4" /> Full CSV Import
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
        rows={paginatedGuards}
        empty="No guards match your search."
      />

      {filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemLabel="guards"
        />
      )}

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
      <PartialGuardModal
        open={partialBulkOpen}
        onClose={() => setPartialBulkOpen(false)}
        regions={regions}
        stations={stations}
        clients={clients}
      />
    </div>
  );
}
