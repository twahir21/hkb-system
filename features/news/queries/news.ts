import "server-only";

import { and, count, desc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { news, users } from "@/lib/db/schema";
import type { NewsStatus } from "@/lib/db/schema";
import type { NewsRow, PublicNews } from "@/features/news/news.types";

const selection = {
  id: news.id,
  slug: news.slug,
  title: news.title,
  summary: news.summary,
  body: news.body,
  coverImageUrl: news.coverImageUrl,
  coverImagePath: news.coverImagePath,
  category: news.category,
  status: news.status,
  publishedAt: news.publishedAt,
  authorId: news.authorId,
  authorName: users.fullName,
  createdAt: news.createdAt,
  updatedAt: news.updatedAt,
};

/** All articles for the dashboard (any status), newest first. */
export async function listNews(status?: NewsStatus): Promise<NewsRow[]> {
  return db
    .select(selection)
    .from(news)
    .leftJoin(users, eq(news.authorId, users.id))
    .where(status ? eq(news.status, status) : undefined)
    .orderBy(desc(news.createdAt));
}

export async function getNewsById(id: string): Promise<NewsRow | null> {
  const [row] = await db
    .select(selection)
    .from(news)
    .leftJoin(users, eq(news.authorId, users.id))
    .where(eq(news.id, id))
    .limit(1);
  return row ?? null;
}

/** Published articles for the public feed, newest first. */
export async function listPublishedNews(limit = 10, offset = 0): Promise<NewsRow[]> {
  return db
    .select(selection)
    .from(news)
    .leftJoin(users, eq(news.authorId, users.id))
    .where(and(eq(news.status, "PUBLISHED"), lte(news.publishedAt, new Date())))
    .orderBy(desc(news.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function countPublishedNews(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(news)
    .where(and(eq(news.status, "PUBLISHED"), lte(news.publishedAt, new Date())));
  return row?.value ?? 0;
}

export async function getPublishedNewsBySlug(slug: string): Promise<NewsRow | null> {
  const [row] = await db
    .select(selection)
    .from(news)
    .leftJoin(users, eq(news.authorId, users.id))
    .where(
      and(
        eq(news.slug, slug),
        eq(news.status, "PUBLISHED"),
        lte(news.publishedAt, new Date())
      )
    )
    .limit(1);
  return row ?? null;
}

/** Map an internal row to the safe public payload (no internal ids/paths). */
export function toPublicNews(row: NewsRow): PublicNews {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverImageUrl: row.coverImageUrl,
    category: row.category,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    author: row.authorName,
  };
}
