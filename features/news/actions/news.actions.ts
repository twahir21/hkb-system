"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { news } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import { deleteFile, storagePathFromUrl, uploadFile } from "@/lib/firebase/firebase-admin";
import {
  isAllowedImage,
  newsCreateSchema,
  newsUpdateSchema,
  slugify,
} from "@/features/news/validators/news.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

/** Ensure a unique slug, appending -2, -3, ... on collision. */
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "news";
  let candidate = root;
  for (let n = 2; ; n += 1) {
    const [existing] = await db
      .select({ id: news.id })
      .from(news)
      .where(
        excludeId
          ? and(eq(news.slug, candidate), ne(news.id, excludeId))
          : eq(news.slug, candidate)
      )
      .limit(1);
    if (!existing) return candidate;
    candidate = `${root}-${n}`;
  }
}

/** The uploaded cover file from the form, or null when none was chosen. */
function coverFile(formData: FormData): File | null {
  const value = formData.get("coverFile");
  if (typeof File === "undefined") return null;
  if (value instanceof File && value.size > 0 && value.name) return value;
  return null;
}

/** Uploads a file to Firebase Storage and returns { url, path } or an error. */
async function storeCover(
  file: File
): Promise<{ ok: true; url: string; path: string | null } | { ok: false; error: string }> {
  const invalid = isAllowedImage(file);
  if (invalid) return { ok: false, error: invalid };

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(buffer, file.name, file.type, "news");
  if (!url) {
    return {
      ok: false,
      error: "Image storage is not configured — add a cover image URL instead.",
    };
  }
  return { ok: true, url, path: storagePathFromUrl(url) };
}

function revalidateNews() {
  revalidatePath("/news");
}

export async function createNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("NEWS_MANAGE");

  const parsed = newsCreateSchema.safeParse({
    title: formData.get("title") ?? undefined,
    slug: formData.get("slug") || undefined,
    summary: formData.get("summary") || undefined,
    body: formData.get("body") ?? undefined,
    category: formData.get("category") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid article" };
  }
  const v = parsed.data;

  // Resolve the cover: an uploaded file wins, otherwise an external URL.
  let coverImageUrl: string | null = null;
  let coverImagePath: string | null = null;
  const file = coverFile(formData);
  if (file) {
    const stored = await storeCover(file);
    if (!stored.ok) return { ok: false, error: stored.error };
    coverImageUrl = stored.url;
    coverImagePath = stored.path;
  } else {
    const external = formData.get("coverImageUrl");
    if (typeof external === "string" && external.trim()) {
      const trimmed = external.trim();
      try {
        new URL(trimmed);
        coverImageUrl = trimmed;
      } catch {
        return { ok: false, error: "Cover image URL is invalid." };
      }
    }
  }

  try {
    const slug = await ensureUniqueSlug(v.slug ?? slugify(v.title));
    const [row] = await db
      .insert(news)
      .values({
        slug,
        title: v.title,
        summary: v.summary ?? null,
        body: v.body,
        category: v.category ?? null,
        coverImageUrl,
        coverImagePath,
        status: v.status,
        publishedAt: v.status === "PUBLISHED" ? new Date() : null,
        authorId: actor.userId,
      })
      .returning({ id: news.id });

    await writeAuditLog({
      actorId: actor.userId,
      action: "NEWS_CREATE",
      entity: "news",
      entityId: row.id,
      metadata: { title: v.title, slug, status: v.status },
    });

    revalidateNews();
    return {
      ok: true,
      message: v.status === "PUBLISHED" ? "Article published." : "Draft saved.",
    };
  } catch (error) {
    console.error("[news] create failed:", error);
    return { ok: false, error: "Could not save the article. Please try again." };
  }
}

export async function updateNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("NEWS_MANAGE");

  const parsed = newsUpdateSchema.safeParse({
    id: formData.get("id") ?? undefined,
    title: formData.get("title") ?? undefined,
    slug: formData.get("slug") || undefined,
    summary: formData.get("summary") || undefined,
    body: formData.get("body") ?? undefined,
    category: formData.get("category") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid article" };
  }
  const { id, ...v } = parsed.data;

  const existing = await db.query.news.findFirst({ where: eq(news.id, id) });
  if (!existing) return { ok: false, error: "Article not found." };

  let coverImageUrl = existing.coverImageUrl;
  let coverImagePath = existing.coverImagePath;
  let oldPathToDelete: string | null = null;

  const file = coverFile(formData);
  if (file) {
    const stored = await storeCover(file);
    if (!stored.ok) return { ok: false, error: stored.error };
    oldPathToDelete = existing.coverImagePath ?? storagePathFromUrl(existing.coverImageUrl ?? "");
    coverImageUrl = stored.url;
    coverImagePath = stored.path;
  } else if (formData.get("removeCover") === "true") {
    oldPathToDelete = existing.coverImagePath ?? storagePathFromUrl(existing.coverImageUrl ?? "");
    coverImageUrl = null;
    coverImagePath = null;
  } else {
    const external = formData.get("coverImageUrl");
    if (typeof external === "string" && external.trim()) {
      const trimmed = external.trim();
      try {
        new URL(trimmed);
        coverImageUrl = trimmed;
      } catch {
        return { ok: false, error: "Cover image URL is invalid." };
      }
    }
  }

  const slug = await ensureUniqueSlug(v.slug ?? existing.slug, id);
  const publishedAt = v.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null;

  await db
    .update(news)
    .set({
      slug,
      title: v.title,
      summary: v.summary ?? null,
      body: v.body,
      category: v.category ?? null,
      coverImageUrl,
      coverImagePath,
      status: v.status,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(news.id, id));

  // Clean up the replaced cover object (best effort, idempotent).
  if (oldPathToDelete) await deleteFile(oldPathToDelete);

  await writeAuditLog({
    actorId: actor.userId,
    action: "NEWS_UPDATE",
    entity: "news",
    entityId: id,
    metadata: { title: v.title, slug, status: v.status },
  });

  revalidateNews();
  return { ok: true, message: "Article updated." };
}

export async function deleteNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("NEWS_MANAGE");

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing article id" };

  const existing = await db.query.news.findFirst({ where: eq(news.id, id) });
  if (!existing) return { ok: false, error: "Article not found." };

  await db.delete(news).where(eq(news.id, id));

  // Remove the cover image object too (best effort).
  const path = existing.coverImagePath ?? storagePathFromUrl(existing.coverImageUrl ?? "");
  if (path) await deleteFile(path);

  await writeAuditLog({
    actorId: actor.userId,
    action: "NEWS_DELETE",
    entity: "news",
    entityId: id,
    metadata: { title: existing.title, slug: existing.slug },
  });

  revalidateNews();
  return { ok: true, message: "Article deleted." };
}

/** Publish / unpublish / archive an article. */
export async function setNewsStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("NEWS_MANAGE");

  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing article id" };
  if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED") {
    return { ok: false, error: "Invalid status" };
  }

  const existing = await db.query.news.findFirst({ where: eq(news.id, id) });
  if (!existing) return { ok: false, error: "Article not found." };

  await db
    .update(news)
    .set({
      status,
      publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(news.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: status === "PUBLISHED" ? "NEWS_PUBLISH" : "NEWS_STATUS",
    entity: "news",
    entityId: id,
    metadata: { status, title: existing.title },
  });

  revalidateNews();
  return {
    ok: true,
    message: status === "PUBLISHED" ? "Article published." : "Article unpublished.",
  };
}
