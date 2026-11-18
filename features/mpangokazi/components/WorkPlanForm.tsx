"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import type { WorkPlanStatus } from "@/lib/db/schema";
import {
  saveWorkPlan,
  type WorkPlanActionState,
} from "@/features/mpangokazi/actions/mpangokazi.actions";
import type { ScopeGuard } from "@/features/mpangokazi/queries/mpangokazi";
import { SignaturePad } from "./SignaturePad";
import { ShareButtons } from "./ShareButtons";
import { WORK_PLAN_STATUSES, WORK_PLAN_STATUS_SW } from "./labels";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const STATUS_COLORS: Record<WorkPlanStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-800",
  OFF: "bg-slate-100 text-slate-700",
  PERMITTED: "bg-amber-50 text-amber-800",
  SICK: "bg-sky-50 text-sky-800",
  ABSENT: "bg-rose-50 text-rose-800",
};

export function WorkPlanForm({
  date,
  maxDate,
  branchName,
  branchId,
  branches,
  guards,
  preparedByName,
  defaultJobPosition,
  existingId,
}: {
  date: string;
  maxDate: string;
  branchName: string;
  branchId: string | null;
  /** Only for branch-wide roles; empty → no branch picker. */
  branches: { id: string; name: string }[];
  guards: ScopeGuard[];
  preparedByName: string;
  defaultJobPosition: string;
  existingId: string | null;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, WorkPlanStatus>>(() =>
    Object.fromEntries(guards.map((g) => [g.guardId, g.status]))
  );
  const [signature, setSignature] = useState("");
  const [state, formAction, pending] = useActionState<WorkPlanActionState, FormData>(saveWorkPlan, {
    ok: false,
  });

  const totals = useMemo(() => {
    const values = Object.values(statuses);
    const c = (s: WorkPlanStatus) => values.filter((v) => v === s).length;
    return {
      total: values.length,
      PRESENT: c("PRESENT"),
      OFF: c("OFF"),
      PERMITTED: c("PERMITTED"),
      SICK: c("SICK"),
      ABSENT: c("ABSENT"),
    };
  }, [statuses]);

  const entriesJson = JSON.stringify(guards.map((g) => ({ guardId: g.guardId, status: statuses[g.guardId] })));
  const savedId = state.ok ? state.id : existingId;

  const go = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ date, ...(branchId ? { branchId } : {}), ...params });
    router.push(`/mpangokazi?${sp.toString()}`);
  };

  return (
    <Card
      title="Fomu ya Mpangokazi"
      subtitle="Hali imejazwa kutoka Shift Sheet. Rekebisha inapobidi, weka sahihi, kisha hifadhi."
      action={savedId ? <ShareButtons id={savedId} fileLabel={`${branchName}-${date}`} /> : undefined}
    >
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="entries" value={entriesJson} />
        <input type="hidden" name="signatureDataUrl" value={signature} />
        <input type="hidden" name="date" value={date} />
        {branchId && <input type="hidden" name="branchId" value={branchId} />}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Tarehe</span>
            <input
              type="date"
              value={date}
              max={maxDate}
              onChange={(e) => e.target.value && go({ date: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Mkoa</span>
            {branches.length > 0 ? (
              <select
                value={branchId ?? ""}
                onChange={(e) => go({ branchId: e.target.value })}
                className={inputCls}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <input value={branchName} readOnly className={`${inputCls} bg-slate-50`} />
            )}
          </label>
          <label className="block">
            <span className={labelCls}>Msimamizi</span>
            <input value={preparedByName} readOnly className={`${inputCls} bg-slate-50`} />
          </label>
        </div>

        {existingId && !state.ok && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Tayari umetuma fomu ya tarehe hii. Ukihifadhi tena, itasasishwa.
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(
            [
              ["Jumla", totals.total, "bg-slate-900 text-white"],
              ["Waliopo", totals.PRESENT, STATUS_COLORS.PRESENT],
              ["Off", totals.OFF, STATUS_COLORS.OFF],
              ["Ruhusa", totals.PERMITTED, STATUS_COLORS.PERMITTED],
              ["Wagonjwa", totals.SICK, STATUS_COLORS.SICK],
              ["Hawapo", totals.ABSENT, STATUS_COLORS.ABSENT],
            ] as const
          ).map(([label, value, cls]) => (
            <div key={label} className={`rounded-lg p-2 text-center ${cls}`}>
              <p className="text-[11px] font-medium">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Na.</th>
                <th className="px-3 py-2">Jina la mlinzi</th>
                <th className="px-3 py-2">Point</th>
                <th className="px-3 py-2">Hali</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guards.map((g, i) => (
                <tr key={g.guardId}>
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{g.guardName}</p>
                    <p className="text-[11px] text-slate-400">{g.employeeId}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{g.point}</td>
                  <td className="px-3 py-2">
                    <select
                      value={statuses[g.guardId]}
                      onChange={(e) =>
                        setStatuses((prev) => ({ ...prev, [g.guardId]: e.target.value as WorkPlanStatus }))
                      }
                      className={`rounded-md border border-slate-300 px-2 py-1 text-xs font-medium ${STATUS_COLORS[statuses[g.guardId]]}`}
                    >
                      {WORK_PLAN_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {WORK_PLAN_STATUS_SW[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {guards.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                    Hakuna walinzi kwenye eneo lako. Muombe HR akupangie walinzi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className={labelCls}>Imeandaliwa na</span>
              <input value={preparedByName} readOnly className={`${inputCls} bg-slate-50`} />
            </label>
            <label className="block">
              <span className={labelCls}>Cheo</span>
              <input name="jobPosition" required defaultValue={defaultJobPosition} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Maelezo (si lazima)</span>
              <textarea name="notes" rows={2} className={inputCls} />
            </label>
          </div>
          <div>
            <span className={labelCls}>Sahihi</span>
            <SignaturePad onChange={setSignature} />
          </div>
        </div>

        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && state.message && (
          <p className="text-sm font-medium text-emerald-700">
            {state.message} Bonyeza “Shiriki” kutuma PDF kwenye kikundi cha ofisi.
          </p>
        )}
        <Button type="submit" disabled={pending || guards.length === 0 || !signature}>
          {pending ? "Inahifadhi…" : "Hifadhi na tengeneza PDF"}
        </Button>
        {!signature && guards.length > 0 && (
          <p className="text-xs text-slate-500">Weka sahihi kabla ya kuhifadhi.</p>
        )}
      </form>
    </Card>
  );
}
