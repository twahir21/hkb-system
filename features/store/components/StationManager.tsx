"use client";

import { useState, useTransition, useActionState, useMemo, useEffect } from "react";
import {
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Search,
  MapPin,
} from "lucide-react";
import { Button, Modal, DataTable, Badge, Pagination, type Column } from "@/components/ui";
import type { StationRow } from "@/features/store/queries/stock";
import {
  updateStation,
  deleteStation,
  type ActionState,
} from "@/features/store/actions/locations.actions";

type RegionOpt = { id: string; name: string };
type SupervisorOpt = { id: string; fullName: string; role?: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function EditStationForm({
  station,
  regions,
  supervisors,
  onDone,
}: {
  station: StationRow;
  regions: RegionOpt[];
  supervisors: SupervisorOpt[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateStation,
    { ok: false }
  );

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(() => {
        onDone();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={station.id} />

      <label className="block">
        <span className={labelSpanCls}>Station Name</span>
        <input
          name="name"
          required
          defaultValue={station.name}
          className={inputCls}
          placeholder="e.g. Post 12"
        />
      </label>

      <label className="block">
        <span className={labelSpanCls}>Region</span>
        <select
          name="regionId"
          required
          defaultValue={station.regionId}
          className={inputCls}
        >
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelSpanCls}>Assigned Supervisor</span>
        <p className="mb-1 text-xs text-slate-500">
          Supervisors oversee attendance and day/night shift sheets for guards posted at this station.
        </p>
        <select
          name="supervisorId"
          defaultValue={station.supervisorId ?? ""}
          className={inputCls}
        >
          <option value="">— None / Unassigned —</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} {s.role ? `(${s.role.replace(/_/g, " ")})` : ""}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving changes…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export function StationManager({
  stations,
  regions,
  supervisors,
}: {
  stations: StationRow[];
  regions: RegionOpt[];
  supervisors: SupervisorOpt[];
}) {
  const [q, setQ] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [editingStation, setEditingStation] = useState<StationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      const matchesQ =
        !q ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.regionName.toLowerCase().includes(q.toLowerCase()) ||
        (s.supervisorName && s.supervisorName.toLowerCase().includes(q.toLowerCase()));

      const matchesRegion = !regionFilter || s.regionId === regionFilter;

      const matchesSupervisor =
        !supervisorFilter ||
        (supervisorFilter === "UNASSIGNED"
          ? !s.supervisorId
          : s.supervisorId === supervisorFilter);

      return matchesQ && matchesRegion && matchesSupervisor;
    });
  }, [stations, q, regionFilter, supervisorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedStations = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleDelete = (stationId: string, stationName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete station "${stationName}"? Guards and stock associated with this station will be unlinked.`
      )
    ) {
      return;
    }

    setActionError(null);
    setDeletingId(stationId);
    startDeleteTransition(async () => {
      try {
        const res = await deleteStation(stationId);
        if (!res.ok && res.error) {
          setActionError(res.error);
        }
      } catch {
        setActionError("Failed to delete station.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const columns: Column<StationRow>[] = [
    {
      key: "name",
      header: "Station / Outpost",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{r.name}</p>
            <p className="text-xs text-slate-400">ID: {r.id.slice(0, 8)}…</p>
          </div>
        </div>
      ),
    },
    {
      key: "region",
      header: "Region",
      cell: (r) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {r.regionName}
        </span>
      ),
    },
    {
      key: "supervisor",
      header: "Assigned Supervisor",
      cell: (r) => (
        <div>
          {r.supervisorName ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              {r.supervisorName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <UserX className="h-3.5 w-3.5 text-amber-500" />
              Unassigned
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setEditingStation(r)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit / Assign
          </button>
          <button
            onClick={() => handleDelete(r.id, r.name)}
            disabled={isDeleting && deletingId === r.id}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            title="Delete station"
          >
            {isDeleting && deletingId === r.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search station, region, supervisor…"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={regionFilter}
          onChange={(e) => {
            setRegionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={supervisorFilter}
          onChange={(e) => {
            setSupervisorFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Supervisors</option>
          <option value="UNASSIGNED">Unassigned Stations</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* Stations Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <DataTable
          columns={columns}
          rows={paginatedStations}
          empty="No stations match your filter criteria."
        />
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemLabel="stations"
        />
      )}

      {/* Edit Station Modal */}
      <Modal
        open={Boolean(editingStation)}
        onClose={() => setEditingStation(null)}
        title={
          editingStation
            ? `Edit Station — ${editingStation.name}`
            : "Edit Station"
        }
      >
        {editingStation && (
          <EditStationForm
            key={editingStation.id}
            station={editingStation}
            regions={regions}
            supervisors={supervisors}
            onDone={() => setEditingStation(null)}
          />
        )}
      </Modal>
    </div>
  );
}
