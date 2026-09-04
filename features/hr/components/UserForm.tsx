"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import {
  createUser,
  updateUser,
  type UserActionState,
} from "@/features/hr/actions/users.actions";
import type { UserRow } from "@/features/hr/queries/users";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Role } from "@/lib/db/schema";

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "SENIOR_SUPERVISOR",
  "SUPERVISOR",
  "HR",
  "BURSAR",
  "GUARD",
];

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function UserForm({
  editing,
  onDone,
}: {
  editing: UserRow | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    UserActionState,
    FormData
  >(editing ? updateUser : createUser, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Full Name
          </label>
          <input
            name="fullName"
            type="text"
            defaultValue={editing?.fullName ?? ""}
            required
            placeholder="e.g. John Doe"
            className={inputCls}
          />
        </div>

        {!editing && (
          <>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="user@hkb.co"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Used for system notifications and Google OAuth sign-in matching.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                placeholder="e.g. jdoe"
                className={inputCls}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Assigned Role
          </label>
          <select
            name="role"
            defaultValue={editing?.role ?? "SUPERVISOR"}
            required
            className={inputCls}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} ({r})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
            {editing
              ? "New Password (leave blank to keep current)"
              : "Password"}
          </label>
          <input
            name="password"
            type="password"
            required={!editing}
            placeholder={editing ? "••••••••••••" : "Min. 6 characters"}
            className={inputCls}
          />
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {state.ok && state.message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm font-medium text-emerald-700">
          {state.message}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onDone} type="button">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : editing ? "Update Account" : "Register User"}
        </Button>
      </div>
    </form>
  );
}
