"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Modal } from "@/components/ui";
import {
  addIncidentAction,
  setIncidentStatus,
} from "@/features/incidents/actions/incidents.actions";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import type { IncidentRow } from "@/features/incidents/queries/incidents";
import { LEVEL_LABELS, LEVEL_TONES, STATUS_LABELS, formatDateTime } from "./labels";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && (
        <p className="text-sm font-medium text-emerald-700">{state.message}</p>
      )}
    </>
  );
}

function AddActionForm({ incidentId }: { incidentId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addIncidentAction, {
    ok: false,
  });
  return (
    <form action={formAction} className="space-y-2" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="incidentId" value={incidentId} />
      <textarea
        name="note"
        required
        rows={2}
        className={inputCls}
        placeholder="Action taken (e.g. Police informed, extra guard posted)"
      />
      <Feedback state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add action"}
      </Button>
    </form>
  );
}

function StatusForm({ incident }: { incident: IncidentRow }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setIncidentStatus, {
    ok: false,
  });
  const resolve = incident.status === "OPEN";
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="incidentId" value={incident.id} />
      <input type="hidden" name="status" value={resolve ? "RESOLVED" : "OPEN"} />
      <input
        name="note"
        className={inputCls}
        placeholder={resolve ? "How was it solved? (optional)" : "Why reopen? (optional)"}
      />
      <Feedback state={state} />
      <Button type="submit" size="sm" variant={resolve ? "success" : "secondary"} disabled={pending}>
        {pending ? "Saving…" : resolve ? "Mark as solved" : "Reopen"}
      </Button>
    </form>
  );
}

export function IncidentList({ rows, canAct }: { rows: IncidentRow[]; canAct: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === openId) ?? null;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3 font-semibold">Incident</th>
              <th className="px-4 py-3 font-semibold">Site / Client</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Reported by</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(r.occurredAt)} · {r.branchName ?? "No branch"}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p>{r.stationName ?? "—"}</p>
                  <p className="text-xs text-slate-400">{r.clientName ?? "No client"}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={LEVEL_TONES[r.level]}>{LEVEL_LABELS[r.level]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.reportedByName}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "RESOLVED" ? "emerald" : "rose"}>
                    {STATUS_LABELS[r.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(r.id)}>
                    {r.actions.length} · Open
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No incidents match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setOpenId(null)}
        title={selected?.title ?? ""}
        wide
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={LEVEL_TONES[selected.level]}>{LEVEL_LABELS[selected.level]}</Badge>
              <Badge tone={selected.status === "RESOLVED" ? "emerald" : "rose"}>
                {STATUS_LABELS[selected.status]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="font-semibold text-slate-500">Site</dt>
                <dd>
                  {selected.stationName ?? "—"}
                  {selected.regionName ? ` (${selected.regionName})` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Client</dt>
                <dd>{selected.clientName ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Branch</dt>
                <dd>{selected.branchName ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Happened</dt>
                <dd>{formatDateTime(selected.occurredAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Reported by</dt>
                <dd>
                  {selected.reportedByName} · {formatDateTime(selected.createdAt)}
                </dd>
              </div>
              {selected.resolvedAt && (
                <div>
                  <dt className="font-semibold text-slate-500">Solved by</dt>
                  <dd>
                    {selected.resolvedByName} · {formatDateTime(selected.resolvedAt)}
                  </dd>
                </div>
              )}
            </dl>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
              {selected.description}
            </p>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions taken
              </h4>
              {selected.actions.length === 0 ? (
                <p className="text-slate-400">No actions yet.</p>
              ) : (
                <ol className="space-y-2">
                  {selected.actions.map((a) => (
                    <li key={a.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="whitespace-pre-wrap text-slate-700">{a.note}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {a.actorName} · {formatDateTime(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {canAct && (
              <div className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                {selected.status === "OPEN" && <AddActionForm incidentId={selected.id} />}
                <StatusForm key={selected.status} incident={selected} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
