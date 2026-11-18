"use client";

import { t } from "@/lib/i18n";
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
import { Button, Modal, DataTable, Pagination, type Column } from "@/components/ui";
import type { StationRow } from "@/features/store/queries/stock";
import {
  updateStation,
  deleteStation,
  type ActionState,
} from "@/features/store/actions/locations.actions";

type RegionOpt = { id: string; name: string };
type SupervisorOpt = { id: string; fullName: string; role?: string };
type InChargeOpt = { id: string; fullName: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function EditStationForm({
  station,
  regions,
  supervisors,
  inCharges,
  onDone,
}: {
  station: StationRow;
  regions: RegionOpt[];
  supervisors: SupervisorOpt[];
  inCharges: InChargeOpt[];
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
        <span className={labelSpanCls}>{t.storeForms.stationName}</span>
        <input
          name="name"
          required
          defaultValue={station.name}
          className={inputCls}
          placeholder={t.storeForms.stationPlaceholder}
        />
      </label>

      <label className="block">
        <span className={labelSpanCls}>{t.common.region}</span>
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
        <span className={labelSpanCls}>{t.guard.supervisor}</span>
        <p className="mb-1 text-xs text-slate-500">
          {t.storeForms.supervisorHint}
        </p>
        <select
          name="supervisorId"
          defaultValue={station.supervisorId ?? ""}
          className={inputCls}
        >
          <option value="">— {t.guard.unassigned} —</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} {s.role ? `(${t.roles[s.role as keyof typeof t.roles] ?? s.role})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelSpanCls}>{t.roles.IN_CHARGE}</span>
        <p className="mb-1 text-xs text-slate-500">
          {t.storeForms.inChargeHint}
        </p>
        <select
          name="inChargeId"
          defaultValue={station.inChargeId ?? ""}
          className={inputCls}
        >
          <option value="">— {t.inc.none} —</option>
          {inCharges.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
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
          {t.common.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : t.cov.saveChanges}
        </Button>
      </div>
    </form>
  );
}

export function StationManager({
  stations,
  regions,
  supervisors,
  inCharges,
}: {
  stations: StationRow[];
  regions: RegionOpt[];
  supervisors: SupervisorOpt[];
  inCharges: InChargeOpt[];
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
        t.storeForms.confirmDelete.replace("{name}", stationName)
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
        setActionError(t.storeForms.deleteFailed);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const columns: Column<StationRow>[] = [
    {
      key: "name",
      header: t.storeForms.stationCol,
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
      header: t.common.region,
      cell: (r) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {r.regionName}
        </span>
      ),
    },
    {
      key: "supervisor",
      header: t.guard.supervisor,
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
              {t.guard.unassigned}
            </span>
          )}
          {r.inChargeName && (
            <p className="mt-1 text-xs text-slate-500">{t.roles.IN_CHARGE}: {r.inChargeName}</p>
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
            <Pencil className="h-3.5 w-3.5" /> {t.storeForms.editAssign}
          </button>
          <button
            onClick={() => handleDelete(r.id, r.name)}
            disabled={isDeleting && deletingId === r.id}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            title={t.storeForms.deleteStation}
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
            placeholder={t.storeForms.search}
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
          <option value="">{t.storeForms.allRegions}</option>
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
          <option value="">{t.msv.allSupervisors}</option>
          <option value="UNASSIGNED">{t.storeForms.unassignedStations}</option>
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
          empty={t.storeForms.empty}
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
          itemLabel={t.region.sites}
        />
      )}

      {/* Edit Station Modal */}
      <Modal
        open={Boolean(editingStation)}
        onClose={() => setEditingStation(null)}
        title={
          editingStation
            ? `${t.storeForms.editStation} — ${editingStation.name}`
            : t.storeForms.editStation
        }
      >
        {editingStation && (
          <EditStationForm
            key={editingStation.id}
            station={editingStation}
            regions={regions}
            supervisors={supervisors}
            inCharges={inCharges}
            onDone={() => setEditingStation(null)}
          />
        )}
      </Modal>
    </div>
  );
}
