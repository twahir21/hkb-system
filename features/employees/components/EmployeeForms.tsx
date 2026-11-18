"use client";

import { useActionState, useState } from "react";
import { Button, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";
import {
  addContract,
  getContractDocumentUrl,
  saveEmployeeProfile,
  setContractStatus,
} from "@/features/employees/actions/employees.actions";
import type { ContractType, Department } from "@/lib/db/schema";

// Client-safe lists (dictionary keys match the DB enums).
const departmentEnum = Object.keys(t.departments) as Department[];
const contractTypeEnum = Object.keys(t.contracts.types) as ContractType[];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && <p className="text-sm font-medium text-emerald-700">{state.message}</p>}
    </>
  );
}

export type ProfileDefaults = {
  employeeNo: string | null;
  department: string | null;
  jobTitle: string | null;
  hireDate: string | null;
  phone: string | null;
  nidaNo: string | null;
  address: string | null;
  kinName: string | null;
  kinPhone: string | null;
};

export function EmployeeProfileForm({
  userId,
  defaults,
  canEdit,
}: {
  userId: string;
  defaults: ProfileDefaults;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveEmployeeProfile, { ok: false });
  const E = t.employees;
  const field = (name: keyof ProfileDefaults, label: string, type = "text") => (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input name={name} type={type} defaultValue={defaults[name] ?? ""} disabled={!canEdit} className={inputCls} />
    </label>
  );

  return (
    <Card title={E.profile}>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="userId" value={userId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{E.department}</span>
            <select
              name="department"
              defaultValue={defaults.department ?? "OPERATIONS"}
              disabled={!canEdit}
              className={inputCls}
            >
              {departmentEnum.map((d) => (
                <option key={d} value={d}>
                  {t.departments[d]}
                </option>
              ))}
            </select>
          </label>
          {field("jobTitle", E.jobTitle)}
          {field("employeeNo", E.employeeNo)}
          {field("hireDate", E.hireDate, "date")}
          {field("phone", E.phone, "tel")}
          {field("nidaNo", E.nida)}
          {field("address", E.address)}
          {field("kinName", E.kinName)}
          {field("kinPhone", E.kinPhone, "tel")}
        </div>
        <Feedback state={state} />
        {canEdit && (
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? E.saving : E.saveProfile}
          </Button>
        )}
      </form>
    </Card>
  );
}

export function ContractForm({ userId, defaultPosition }: { userId: string; defaultPosition: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addContract, { ok: false });
  const [type, setType] = useState<string>("FIXED_TERM");
  const C = t.contracts;

  return (
    <Card title={C.add}>
      <form action={formAction} className="space-y-3" key={state.ok ? state.message : "contract"}>
        <input type="hidden" name="userId" value={userId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{C.type}</span>
            <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {contractTypeEnum.map((ct) => (
                <option key={ct} value={ct}>
                  {C.types[ct]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>{C.position}</span>
            <input name="position" required defaultValue={defaultPosition} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{C.start}</span>
            <input name="startDate" type="date" required className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{C.end}</span>
            <input name="endDate" type="date" required={type !== "PERMANENT"} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{C.salary}</span>
            <input name="monthlySalary" type="number" min={0} step="1000" className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>{C.document}</span>
            <input name="document" type="file" accept="application/pdf" className="text-xs" />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>{C.notes}</span>
          <textarea name="notes" rows={2} className={inputCls} />
        </label>
        <Feedback state={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.employees.saving : C.add}
        </Button>
      </form>
    </Card>
  );
}

export function ContractRowActions({
  id,
  status,
  hasDocument,
  canManage,
}: {
  id: string;
  status: string;
  hasDocument: boolean;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setContractStatus, { ok: false });
  const [err, setErr] = useState<string | null>(null);
  const C = t.contracts;

  const download = async () => {
    setErr(null);
    const res = await getContractDocumentUrl(id);
    if (res.ok) window.open(res.url, "_blank", "noopener");
    else setErr(res.error);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {hasDocument && (
        <Button size="sm" variant="ghost" type="button" onClick={download}>
          {C.download}
        </Button>
      )}
      {canManage && status === "ACTIVE" && (
        <form action={formAction} className="flex gap-1">
          <input type="hidden" name="id" value={id} />
          <Button size="sm" variant="secondary" name="status" value="ENDED" disabled={pending}>
            {C.end_}
          </Button>
          <Button size="sm" variant="danger" name="status" value="TERMINATED" disabled={pending}>
            {C.terminate}
          </Button>
        </form>
      )}
      {(err || state.error) && <p className="w-full text-right text-[11px] text-rose-600">{err ?? state.error}</p>}
    </div>
  );
}
