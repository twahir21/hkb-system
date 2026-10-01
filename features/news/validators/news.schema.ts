import { z } from "zod";

export const NEWS_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type NewsStatusInput = (typeof NEWS_STATUSES)[number];

/** URL-safe slug: lowercase alphanumerics separated by single hyphens. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Cover-image guard shared by the client (immediate feedback) and the server
 * action (authoritative). The 4 MB ceiling keeps uploads under Vercel's
 * serverless request-body limit.
 */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** Returns an error message, or null when the file is an acceptable image. */
export function isAllowedImage(file: { type: string; size: number }): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) {
    return "Only PNG, JPEG, WEBP or GIF images are allowed.";
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return "Image is too large (maximum 4 MB).";
  }
  return null;
}

export const newsCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title is required")
    .max(250, "Title is too long"),
  slug: z
    .string()
    .trim()
    .max(220, "Slug is too long")
    .regex(SLUG_REGEX, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
  summary: z.string().trim().max(500, "Summary is too long").optional(),
  body: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(100_000, "Content is too long"),
  category: z.string().trim().max(100, "Category is too long").optional(),
  coverImageUrl: z.string().trim().url("Cover image URL is invalid").max(1000).optional(),
  status: z.enum(NEWS_STATUSES).default("DRAFT"),
});

export const newsUpdateSchema = newsCreateSchema.extend({
  id: z.string().uuid("Invalid article id"),
});

export type NewsCreateInput = z.infer<typeof newsCreateSchema>;
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>;

/** Convert a title into a URL-safe slug. */
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return slug || "news";
}
