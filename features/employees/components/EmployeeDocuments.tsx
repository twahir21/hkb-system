"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { EmployeeDocumentType } from "@/lib/db/schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import {
  deleteEmployeeDocument,
  getEmployeeDocumentUrl,
  uploadEmployeeDocument,
} from "@/features/employees/actions/documents.actions";

const DOC_TYPES = Object.keys(t.documents.types) as EmployeeDocumentType[];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export type EmployeeDocumentDTO = {
  id: string;
  type: EmployeeDocumentType;
  title: string;
  fileName: string;
  sizeBytes: number;
  expiresOn: string | null;
  uploadedByName: string | null;
  createdAt: string; // YYYY-MM-DD
};

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocumentRow({ doc, canManage, today }: { doc: EmployeeDocumentDTO; canManage: boolean; today: string }) {
  const D = t.documents;
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const expired = doc.expiresOn !== null && doc.expiresOn < today;

  const open = () =>
    start(async () => {
      setErr(null);
      const res = await getEmployeeDocumentUrl(doc.id);
      if (res.ok) window.open(res.url, "_blank", "noopener");
      else setErr(res.error);
    });

  const remove = () => {
    if (!window.confirm(D.confirmRemove)) return;
    start(async () => {
      setErr(null);
      const res = await deleteEmployeeDocument(doc.id);
      if (!res.ok) setErr(res.error);
    });
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-800">
          {doc.title} <Badge tone="slate">{D.types[doc.type]}</Badge>{" "}
          {expired && <Badge tone="rose">{D.expired}</Badge>}
        </p>
        <p className="truncate text-xs text-slate-500">
          {doc.fileName} · {formatSize(doc.sizeBytes)}
          {doc.expiresOn ? ` · ${D.expiresOn} ${doc.expiresOn}` : ""}
        </p>
        <p className="text-[11px] text-slate-400">
          {D.uploadedBy}: {doc.uploadedByName ?? "—"} · {doc.createdAt}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button size="sm" variant="ghost" type="button" onClick={open} disabled={pending}>
          {D.view}
        </Button>
        {canManage && (
          <Button size="sm" variant="danger" type="button" onClick={remove} disabled={pending}>
            {D.remove}
          </Button>
        )}
        {err && <p className="w-full text-right text-[11px] text-rose-600">{err}</p>}
      </div>
    </li>
  );
}

export function EmployeeDocuments({
  userId,
  documents,
  canManage,
  today,
}: {
  userId: string;
  documents: EmployeeDocumentDTO[];
  canManage: boolean;
  today: string;
}) {
  const D = t.documents;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(uploadEmployeeDocument, { ok: false });

  return (
    <Card title={D.title}>
      {documents.length === 0 ? (
        <p className="text-sm text-slate-400">{D.none}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((d) => (
            <DocumentRow key={d.id} doc={d} canManage={canManage} today={today} />
          ))}
        </ul>
      )}

      {canManage && (
        <form
          action={formAction}
          className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          key={state.ok ? state.message : "doc"}
        >
          <input type="hidden" name="userId" value={userId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>{D.type}</span>
              <select name="type" defaultValue="NATIONAL_ID" className={inputCls}>
                {DOC_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {D.types[dt]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>{D.name}</span>
              <input name="title" required minLength={2} maxLength={200} placeholder={D.namePlaceholder} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>{D.file}</span>
              <input
                name="file"
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="text-xs"
              />
            </label>
            <label className="block">
              <span className={labelCls}>{D.expires}</span>
              <input name="expiresOn" type="date" className={inputCls} />
            </label>
          </div>
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
          {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? D.uploading : D.add}
          </Button>
        </form>
      )}
    </Card>
  );
}
