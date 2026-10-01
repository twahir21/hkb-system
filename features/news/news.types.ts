import type { NewsStatus } from "@/lib/db/schema";

/** A news article row as returned by the dashboard queries. */
export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  category: string | null;
  status: NewsStatus;
  publishedAt: Date | null;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Public payload shape served to the marketing website via /api/news. */
export type PublicNews = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string;
  coverImageUrl: string | null;
  category: string | null;
  publishedAt: string | null;
  author: string | null;
};
