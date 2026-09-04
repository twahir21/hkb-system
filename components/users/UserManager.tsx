"use client";

import { useState, useTransition } from "react";
import { UserPlus, Upload, Pencil, Trash2, Shield, KeyRound, Globe, Loader2 } from "lucide-react";
import { Button, Modal, DataTable, Badge, type Column } from "@/components/ui";
import type { UserRow } from "@/lib/queries/users";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { UserForm } from "./UserForm";
import { BulkUserModal } from "./BulkUserModal";
import { deleteUser } from "@/app/actions/users.actions";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/lib/db/schema";

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesQ =
      !q ||
      u.fullName.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(q.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;

    return matchesQ && matchesRole;
  });

  const handleDelete = (userId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to delete account for "${fullName}"? This action cannot be undone.`)) {
      return;
    }
    setActionError(null);
    setDeletingId(userId);
    startDeleteTransition(async () => {
      try {
        const res = await deleteUser(userId);
        if (!res.ok && res.error) {
          setActionError(res.error);
        }
      } catch {
        setActionError("Failed to delete user account.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const getRoleBadgeTone = (role: Role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "brand" as const;
      case "SENIOR_SUPERVISOR":
      case "SUPERVISOR":
        return "emerald" as const;
      case "HR":
        return "violet" as const;
      case "BURSAR":
        return "amber" as const;
      default:
        return "slate" as const;
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: "user",
      header: "User / Account",
      cell: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.fullName}</p>
          <p className="font-mono text-xs text-slate-500">
            {r.username ? `@${r.username}` : "No username"}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => <span className="text-xs text-slate-600">{r.email}</span>,
    },
    {
      key: "role",
      header: "System Role",
      cell: (r) => <Badge tone={getRoleBadgeTone(r.role)}>{ROLE_LABELS[r.role]}</Badge>,
    },
    {
      key: "auth",
      header: "Sign-In Methods",
      cell: (r) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          {r.hasPassword && (
            <span
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700"
              title="Password authentication enabled"
            >
              <KeyRound className="h-3 w-3 text-slate-500" /> Password
            </span>
          )}
          {r.hasGoogle && (
            <span
              className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800"
              title="Google OAuth linked"
            >
              <Globe className="h-3 w-3 text-amber-700" /> Google
            </span>
          )}
          {!r.hasPassword && !r.hasGoogle && (
            <span className="text-[11px] text-amber-600">Pending initial sign-in</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      cell: (r) => (
        <span className="text-xs text-slate-500">{formatDate(r.createdAt.toISOString())}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setEditing(r);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          {r.id !== currentUserId && (
            <button
              onClick={() => handleDelete(r.id, r.fullName)}
              disabled={isDeleting && deletingId === r.id}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {isDeleting && deletingId === r.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete
            </button>
          )}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or username…"
            className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([r, label]) => (
              <option key={r} value={r}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setBulkOpen(true)}
          >
            <Upload className="h-4 w-4" /> Bulk Import (CSV)
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" /> Register New User
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <DataTable columns={columns} rows={filtered} empty="No user accounts found matching your criteria." />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Account — ${editing.fullName}` : "Register New System User"}
      >
        <UserForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setOpen(false)}
        />
      </Modal>

      <BulkUserModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
