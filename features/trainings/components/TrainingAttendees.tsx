"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role, TrainingAttendance } from "@/lib/db/schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import {
  addTrainingAttendees,
  getTrainingCertificateUrl,
  removeTrainingAttendee,
  saveTrainingCompletion,
  setTrainingAttendance,
} from "@/features/trainings/actions/trainings.actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

/** Most people rendered at once in the picker (search narrows the rest). */
const PICKER_LIMIT = 200;

export const ATTENDANCE_TONE = { PENDING: "slate", PRESENT: "emerald", ABSENT: "rose" } as const;

export type AttendeeDTO = {
  userId: string;
  fullName: string;
  role: Role;
  branchName: string | null;
  attendance: TrainingAttendance;
  completed: boolean;
  completedOn: string | null;
  certificateNo: string | null;
  certificateFileName: string | null;
};

type Person = { id: string; fullName: string; role: Role };

/** Pick employees / guards to enrol in a training. */
export function EnrolForm({ trainingId, people }: { trainingId: string; people: Person[] }) {
  const T = t.trainings;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await addTrainingAttendees(prev, fd);
    if (res.ok) setPicked(new Set());
    return res;
  }, { ok: false });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) => !q || p.fullName.toLowerCase().includes(q) || ROLE_LABELS[p.role].toLowerCase().includes(q)
    );
  }, [people, query]);
  const shown = matches.slice(0, PICKER_LIMIT);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card title={T.addAttendees} subtitle={T.addAttendeesHint}>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="trainingId" value={trainingId} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={T.searchPeople}
          className={inputCls}
        />
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="font-semibold text-brand-700 hover:underline"
            onClick={() => setPicked((prev) => new Set([...prev, ...shown.map((p) => p.id)]))}
          >
            {T.selectShown}
          </button>
          <button type="button" className="text-slate-500 hover:underline" onClick={() => setPicked(new Set())}>
            {T.clear}
          </button>
          <span className="ml-auto text-slate-400">
            {picked.size} {T.selected}
          </span>
        </div>
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {shown.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="truncate text-slate-800">{p.fullName}</span>
                <span className="ml-auto shrink-0 text-[11px] text-slate-400">{ROLE_LABELS[p.role]}</span>
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-slate-400">—</li>}
        </ul>
        {matches.length > PICKER_LIMIT && (
          <p className="text-[11px] text-slate-400">
            {T.moreMatches.replace("{n}", String(matches.length - PICKER_LIMIT))}
          </p>
        )}
        {[...picked].map((id) => (
          <input key={id} type="hidden" name="userIds" value={id} />
        ))}
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
        <Button type="submit" size="sm" disabled={pending || picked.size === 0}>
          {pending ? T.saving : T.enrol}
        </Button>
      </form>
    </Card>
  );
}

/** Opens a certificate through a short-lived signed link. */
export function CertificateButton({ trainingId, userId }: { trainingId: string; userId: string }) {
  const T = t.trainings;
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = () =>
    start(async () => {
      setErr(null);
      const res = await getTrainingCertificateUrl(trainingId, userId);
      if (res.ok) window.open(res.url, "_blank", "noopener");
      else setErr(res.error);
    });
  return (
    <span className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" type="button" onClick={open} disabled={pending}>
        {T.viewCertificate}
      </Button>
      {err && <span className="text-[11px] text-rose-600">{err}</span>}
    </span>
  );
}

function CompletionForm({ trainingId, a, today, onDone }: { trainingId: string; a: AttendeeDTO; today: string; onDone: () => void }) {
  const T = t.trainings;
  const [completed, setCompleted] = useState(true);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await saveTrainingCompletion(prev, fd);
    if (res.ok) onDone();
    return res;
  }, { ok: false });

  return (
    <form action={formAction} className="mt-2 w-full space-y-2 rounded-lg bg-slate-50 p-3">
      <input type="hidden" name="trainingId" value={trainingId} />
      <input type="hidden" name="userId" value={a.userId} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="completed" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
        {T.completedLabel}
      </label>
      {completed && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{T.completedOn}</span>
            <input name="completedOn" type="date" max={today} defaultValue={a.completedOn ?? today} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{T.certificateNo}</span>
            <input name="certificateNo" maxLength={100} defaultValue={a.certificateNo ?? ""} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{a.certificateFileName ? T.replaceCertificate : T.certificateFile}</span>
            <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-xs" />
          </label>
          {a.certificateFileName && (
            <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
              <input type="checkbox" name="removeFile" /> {T.removeCertificate} ({a.certificateFileName})
            </label>
          )}
        </div>
      )}
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? T.saving : T.saveRecord}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          {T.close}
        </Button>
      </div>
    </form>
  );
}

function AttendeeRow({
  trainingId,
  a,
  canManage,
  canMark,
  today,
}: {
  trainingId: string;
  a: AttendeeDTO;
  canManage: boolean;
  canMark: boolean;
  today: string;
}) {
  const T = t.trainings;
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr(null);
      const res = await fn();
      if (!res.ok) setErr(res.error ?? T.error);
    });

  const mark = (v: TrainingAttendance) => run(() => setTrainingAttendance(trainingId, a.userId, v));
  const remove = () => {
    if (!window.confirm(T.confirmRemove)) return;
    run(() => removeTrainingAttendee(trainingId, a.userId));
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-800">
          {a.fullName} <Badge tone={ATTENDANCE_TONE[a.attendance]}>{T.attendance[a.attendance]}</Badge>{" "}
          {a.completed && <Badge tone="violet">{T.completed}</Badge>}
        </p>
        <p className="text-[11px] text-slate-400">
          {ROLE_LABELS[a.role]}
          {a.branchName ? ` · ${a.branchName}` : ""}
          {a.completed && a.completedOn ? ` · ${T.completedOn}: ${a.completedOn}` : ""}
          {a.certificateNo ? ` · ${T.certificateNo}: ${a.certificateNo}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {a.certificateFileName && <CertificateButton trainingId={trainingId} userId={a.userId} />}
        {canMark && (
          <>
            <Button
              size="sm"
              type="button"
              variant={a.attendance === "PRESENT" ? "success" : "ghost"}
              onClick={() => mark(a.attendance === "PRESENT" ? "PENDING" : "PRESENT")}
              disabled={pending}
            >
              {T.markPresent}
            </Button>
            <Button
              size="sm"
              type="button"
              variant={a.attendance === "ABSENT" ? "danger" : "ghost"}
              onClick={() => mark(a.attendance === "ABSENT" ? "PENDING" : "ABSENT")}
              disabled={pending}
            >
              {T.markAbsent}
            </Button>
            {a.attendance === "PRESENT" && !editing && (
              <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
                {T.completion}
              </Button>
            )}
          </>
        )}
        {canManage && (
          <Button size="sm" type="button" variant="ghost" onClick={remove} disabled={pending}>
            {T.remove}
          </Button>
        )}
      </div>
      {err && <p className="w-full text-right text-[11px] text-rose-600">{err}</p>}
      {editing && <CompletionForm trainingId={trainingId} a={a} today={today} onDone={() => setEditing(false)} />}
    </li>
  );
}

export function AttendeeList({
  trainingId,
  attendees,
  canManage,
  canMark,
  today,
  title,
}: {
  trainingId: string;
  attendees: AttendeeDTO[];
  canManage: boolean;
  canMark: boolean;
  today: string;
  title: string;
}) {
  const T = t.trainings;
  return (
    <Card title={title}>
      {attendees.length === 0 ? (
        <p className="text-sm text-slate-400">{T.noAttendees}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {attendees.map((a) => (
            <AttendeeRow
              key={a.userId}
              trainingId={trainingId}
              a={a}
              canManage={canManage}
              canMark={canMark}
              today={today}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
