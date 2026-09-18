"use client";

import { useState, useTransition, useMemo } from "react";
import {
  UserPlus,
  Upload,
  Pencil,
  Trash2,
  KeyRound,
  Globe,
  Loader2,
} from "lucide-react";
import {
  Button,
  Modal,
  DataTable,
  Badge,
  Pagination,
  type Column,
} from "@/components/ui";
import type { UserRow } from "@/features/hr/queries/users";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { UserForm } from "./UserForm";
import { BulkUserModal } from "./BulkUserModal";
import { deleteUser } from "@/features/hr/actions/users.actions";
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
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const maleCount = useMemo(() => users.filter((u) => u.gender === "MALE").length, [users]);
  const femaleCount = useMemo(() => users.filter((u) => u.gender === "FEMALE").length, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesQ =
        !q ||
        u.fullName.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(q.toLowerCase()));

      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesGender = !genderFilter || u.gender === genderFilter;

      return matchesQ && matchesRole && matchesGender;
    });
  }, [users, q, roleFilter, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleDelete = (userId: string, fullName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete account for "${fullName}"? This action cannot be undone.`,
      )
    ) {
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
      case "OPERATION_OFFICER":
      case "SUPERVISOR":
        return "emerald" as const;
      case "HR":
      case "SECRETARY":
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
      key: "gender",
      header: "Gender",
      cell: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.gender === "FEMALE"
              ? "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200"
              : "bg-sky-50 text-sky-700 border border-sky-200"
          }`}
        >
          {r.gender === "FEMALE" ? "Female" : "Male"}
        </span>
      ),
    },
    {
      key: "role",
      header: "System Role",
      cell: (r) => (
        <Badge tone={getRoleBadgeTone(r.role)}>{ROLE_LABELS[r.role]}</Badge>
      ),
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
            <span className="text-[11px] text-amber-600">
              Pending initial sign-in
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      cell: (r) => (
        <span className="text-xs text-slate-500">
          {formatDate(r.createdAt.toISOString())}
        </span>
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

      {/* Stats and Gender Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Staff / Users</p>
            <p className="text-xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs">
            All
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-sky-700">Male Staff</p>
            <p className="text-xl font-bold text-sky-950">{maleCount}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
            {users.length > 0 ? Math.round((maleCount / users.length) * 100) : 0}%
          </span>
        </div>

        <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-fuchsia-700">Female Staff</p>
            <p className="text-xl font-bold text-fuchsia-950">{femaleCount}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-fuchsia-100 px-2 py-1 text-xs font-semibold text-fuchsia-800">
            {users.length > 0 ? Math.round((femaleCount / users.length) * 100) : 0}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or username…"
            className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([r, label]) => (
              <option key={r} value={r}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700"
          >
            <option value="">All Genders</option>
            <option value="MALE">Male ({maleCount})</option>
            <option value="FEMALE">Female ({femaleCount})</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
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
        <DataTable
          columns={columns}
          rows={paginatedUsers}
          empty="No user accounts found matching your criteria."
        />
      </div>

      {filtered.length > 0 && (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemLabel="user accounts"
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? `Edit Account — ${editing.fullName}`
            : "Register New System User"
        }
      >
        <UserForm
          key={editing?.id ?? "new"}
          editing={editing}
          onDone={() => setOpen(false)}
        />
      </Modal>

      <BulkUserModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}
