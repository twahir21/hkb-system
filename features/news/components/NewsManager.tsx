"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, DataTable, Modal, type Column } from "@/components/ui";
import {
  deleteNews,
  setNewsStatus,
  type ActionState,
} from "@/features/news/actions/news.actions";
import { NewsForm } from "./NewsForm";
import type { NewsRow } from "@/features/news/news.types";

function formatDate(value: Date | null): string {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function StatusToggle({ article }: { article: NewsRow }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setNewsStatus, {
    ok: false,
  });
  const published = article.status === "PUBLISHED";

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={article.id} />
      <input type="hidden" name="status" value={published ? "DRAFT" : "PUBLISHED"} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        title={state.error ?? (published ? "Unpublish" : "Publish")}
      >
        {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {published ? "Unpublish" : "Publish"}
      </Button>
    </form>
  );
}

function DeleteButton({ article }: { article: NewsRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteNews, {
    ok: false,
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        title="Delete article"
      >
        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete article">
        <p className="text-sm text-slate-600">
          Delete &ldquo;{article.title}&rdquo;? This also removes its cover image and cannot be
          undone.
        </p>
        {state.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
        <form action={formAction} className="mt-4 flex justify-end gap-2">
          <input type="hidden" name="id" value={article.id} />
          <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" type="submit" disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function NewsManager({ items, canManage }: { items: NewsRow[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (article: NewsRow) => {
    setEditing(article);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  const columns: Column<NewsRow>[] = [
    {
      key: "title",
      header: "Title",
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.coverImageUrl ? (
            <img
              src={r.coverImageUrl}
              alt=""
              className="h-10 w-14 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="h-10 w-14 shrink-0 rounded bg-slate-100" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{r.title}</p>
            <p className="truncate text-xs text-slate-400">/{r.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (r) => r.category ?? "—" },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          tone={r.status === "PUBLISHED" ? "emerald" : r.status === "DRAFT" ? "amber" : "slate"}
        >
          {r.status}
        </Badge>
      ),
    },
    { key: "publishedAt", header: "Published", cell: (r) => formatDate(r.publishedAt) },
    { key: "author", header: "Author", cell: (r) => r.authorName ?? "—" },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit article">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <StatusToggle article={r} />
          <DeleteButton article={r} />
        </div>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New article
          </Button>
        </div>
      )}

      <DataTable columns={columns} rows={items} empty="No news articles yet." />

      <Modal open={open} onClose={close} title={editing ? "Edit article" : "New article"} wide>
        <NewsForm article={editing} onDone={close} />
      </Modal>
    </div>
  );
}
