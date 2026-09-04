"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  createGuard,
  updateGuard,
  type GuardState,
} from "@/features/hr/actions/guards.actions";
import type { GuardRow } from "@/features/hr/queries/guards";

type Supervisor = { id: string; name: string; role: string };

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        className={inputCls}
      />
    </label>
  );
}

export function GuardForm({
  supervisors,
  editing,
  onDone,
}: {
  supervisors: Supervisor[];
  editing: GuardRow | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<GuardState, FormData>(
    editing ? updateGuard : createGuard,
    { ok: false },
  );

  return (
    <form action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!editing && (
          <>
            <Field
              label="Email"
              name="email"
              type="email"
              required
              className="sm:col-span-2"
            />
            <Field
              label="Full name"
              name="fullName"
              required
              className="sm:col-span-2"
            />
            <Field label="Employee ID" name="employeeId" required />
            <Field
              label="Registration date"
              name="registrationDate"
              type="date"
              required
            />
          </>
        )}
        <Field
          label="Age"
          name="age"
          type="number"
          defaultValue={editing?.age}
          required
        />
        <Field
          label="Phone"
          name="phone"
          defaultValue={editing?.phone}
          required
        />
        <Field
          label="Work location"
          name="workLocation"
          defaultValue={editing?.workLocation}
          required
          className="sm:col-span-2"
        />
        <Field
          label="Home location"
          name="homeLocation"
          defaultValue={editing?.homeLocation}
          required
          className="sm:col-span-2"
        />
        <Field
          label="Next of kin name"
          name="kinName"
          defaultValue={editing?.kinName}
          required
        />
        <Field
          label="Kin relation"
          name="kinRelation"
          defaultValue={editing?.kinRelation}
          required
        />
        <Field
          label="Kin phone"
          name="kinPhone"
          defaultValue={editing?.kinPhone}
          required
        />
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Assigned supervisor
        </span>
        <select
          name="assignedSupervisorId"
          defaultValue={editing?.assignedSupervisorId ?? ""}
          className={inputCls}
        >
          <option value="">Unassigned</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>
      </label>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onDone} type="button">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update guard" : "Register guard"}
        </Button>
      </div>
    </form>
  );
}
