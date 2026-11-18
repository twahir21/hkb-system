"use client";

import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import { reportIncident } from "@/features/incidents/actions/incidents.actions";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import type { SiteOption } from "@/features/incidents/queries/incidents";
import { LEVELS, LEVEL_LABELS } from "./labels";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function IncidentReportForm({
  sites,
  clients,
}: {
  sites: SiteOption[];
  clients: { id: string; name: string; isActive: boolean }[];
}) {
  // datetime-local has no timezone; send an ISO string built in the browser.
  const [localTime, setLocalTime] = useState("");
  const occurredIso = localTime ? new Date(localTime).toISOString() : "";
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await reportIncident(prev, formData);
      if (result.ok) setLocalTime(""); // React resets the other (uncontrolled) fields
      return result;
    },
    { ok: false }
  );

  return (
    <Card title="Report incident" subtitle="Anything that happened at a site and needs follow-up">
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelCls}>Title</span>
          <input name="title" required className={inputCls} placeholder="e.g. Break-in attempt at gate" />
        </label>
        <label className="block">
          <span className={labelCls}>Site</span>
          <select name="stationId" required className={inputCls} defaultValue="">
            <option value="" disabled>
              Choose site…
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.regionName} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Client (optional)</span>
          <select name="clientId" className={inputCls} defaultValue="">
            <option value="">— None —</option>
            {clients
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Emergency level</span>
            <select name="level" required className={inputCls} defaultValue="MEDIUM">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>When</span>
            <input
              type="datetime-local"
              required
              className={inputCls}
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
            />
            <input type="hidden" name="occurredAt" value={occurredIso} />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>What happened</span>
          <textarea name="description" required rows={4} className={inputCls} />
        </label>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && state.message && (
          <p className="text-sm font-medium text-emerald-700">{state.message}</p>
        )}
        <Button type="submit" size="sm" disabled={pending || sites.length === 0}>
          {pending ? "Saving…" : "Report incident"}
        </Button>
        {sites.length === 0 && (
          <p className="text-xs text-amber-600">No sites available. Ask the Storekeeper to add stations.</p>
        )}
      </form>
    </Card>
  );
}
