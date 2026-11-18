"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@/lib/db/schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import {
  cancelMeeting,
  createMeeting,
  getMeetingMinutesUrl,
  saveMeetingMinutes,
} from "@/features/meetings/actions/meetings.actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type Staff = { id: string; fullName: string; role: Role; branchId: string | null };
type Branch = { id: string; name: string; isHq: boolean };

/** `fixedBranchId`: branch-limited organiser (Office Assistant) — no "all branches" option. */
export function MeetingForm({
  staff,
  branches,
  fixedBranchId,
}: {
  staff: Staff[];
  branches: Branch[];
  fixedBranchId?: string;
}) {
  const M = t.meetings;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createMeeting, { ok: false });
  const [branchId, setBranchId] = useState(fixedBranchId ?? "");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter(
      (s) =>
        (!branchId || s.branchId === branchId) &&
        (!q || s.fullName.toLowerCase().includes(q) || ROLE_LABELS[s.role].toLowerCase().includes(q))
    );
  }, [staff, branchId, query]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card title={M.new} subtitle={M.eatNote}>
      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className={labelCls}>{M.meetingTitle}</span>
          <input name="title" required minLength={3} maxLength={200} className={inputCls} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{M.starts}</span>
            <input name="startsAt" type="datetime-local" required className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{M.ends}</span>
            <input name="endsAt" type="datetime-local" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{M.venue}</span>
            <input name="venue" maxLength={255} placeholder={M.venuePlaceholder} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{M.onlineLink}</span>
            <input name="onlineLink" type="url" placeholder={M.onlineLinkPlaceholder} className={inputCls} />
          </label>
        </div>
        <p className="-mt-1 text-[11px] text-slate-400">{M.venueHint}</p>
        <label className="block">
          <span className={labelCls}>{M.branch}</span>
          <select
            name="branchId"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className={inputCls}
          >
            {!fixedBranchId && <option value="">{M.allBranches}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.isHq ? " (HQ)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{M.agenda}</span>
          <textarea name="agenda" required rows={5} maxLength={5000} placeholder={M.agendaPlaceholder} className={inputCls} />
        </label>

        <fieldset className="space-y-2">
          <legend className={labelCls}>
            {M.invitees} · {picked.size} {M.selected}
          </legend>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={M.searchStaff}
            className={inputCls}
          />
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="font-semibold text-brand-700 hover:underline"
              onClick={() => setPicked((prev) => new Set([...prev, ...shown.map((s) => s.id)]))}
            >
              {M.selectShown}
            </button>
            <button type="button" className="text-slate-500 hover:underline" onClick={() => setPicked(new Set())}>
              {M.clear}
            </button>
          </div>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {shown.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                  <span className="truncate text-slate-800">{s.fullName}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-slate-400">{ROLE_LABELS[s.role]}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-slate-400">—</li>}
          </ul>
          {[...picked].map((id) => (
            <input key={id} type="hidden" name="invitees" value={id} />
          ))}
        </fieldset>

        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? M.saving : M.save}
        </Button>
      </form>
    </Card>
  );
}

export function CancelMeetingButton({ id }: { id: string }) {
  const M = t.meetings;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(cancelMeeting, { ok: false });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(M.confirmCancel)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="danger" disabled={pending}>
        {M.cancel}
      </Button>
      {state.error && <p className="text-[11px] text-rose-600">{state.error}</p>}
    </form>
  );
}

/** Minutes (kumbukumbu): read view for everyone who sees the meeting, edit form for organisers. */
export function MeetingMinutes({
  meetingId,
  text,
  fileName,
  updatedLabel,
  canEdit,
}: {
  meetingId: string;
  text: string | null;
  fileName: string | null;
  updatedLabel: string | null; // e.g. "18/11/2026 14:30 · Jina"
  canEdit: boolean;
}) {
  const M = t.meetings;
  const hasMinutes = Boolean(text || fileName);
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await saveMeetingMinutes(prev, fd);
    if (res.ok) setEditing(false);
    return res;
  }, { ok: false });
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [opening, start] = useTransition();

  const openFile = () =>
    start(async () => {
      setFileErr(null);
      const res = await getMeetingMinutesUrl(meetingId);
      if (res.ok) window.open(res.url, "_blank", "noopener");
      else setFileErr(res.error);
    });

  return (
    <Card title={M.minutes}>
      {!editing && (
        <div className="space-y-3">
          {!hasMinutes && <p className="text-sm text-slate-400">{M.noMinutes}</p>}
          {text && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>}
          {fileName && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="truncate text-slate-600">📎 {fileName}</span>
              <Button size="sm" variant="ghost" type="button" onClick={openFile} disabled={opening}>
                {M.minutesOpen}
              </Button>
              {fileErr && <span className="text-[11px] text-rose-600">{fileErr}</span>}
            </div>
          )}
          {updatedLabel && (
            <p className="text-[11px] text-slate-400">
              {M.minutesUpdated}: {updatedLabel}
            </p>
          )}
          {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
          {canEdit && (
            <Button size="sm" type="button" onClick={() => setEditing(true)}>
              {hasMinutes ? M.minutesEdit : M.minutesAdd}
            </Button>
          )}
        </div>
      )}

      {editing && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={meetingId} />
          <label className="block">
            <span className={labelCls}>{M.minutesText}</span>
            <textarea
              name="minutesText"
              rows={10}
              maxLength={50000}
              defaultValue={text ?? ""}
              placeholder={M.minutesPlaceholder}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{fileName ? M.minutesReplaceFile : M.minutesFile}</span>
            <input
              name="file"
              type="file"
              accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
              className="text-xs"
            />
            <span className="mt-1 block text-[11px] text-slate-400">{M.minutesFileHint}</span>
          </label>
          {fileName && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="removeFile" /> {M.minutesRemoveFile} ({fileName})
            </label>
          )}
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? M.saving : M.minutesSave}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              {M.minutesCancelEdit}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
