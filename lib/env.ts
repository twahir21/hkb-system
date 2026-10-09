import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Centralized, validated environment variables.
 * Fails fast at server boot if a required variable is missing/misconfigured.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1, "DATABASE_URL (Neon Postgres) is required"),

    // NextAuth / Google OAuth
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),

    // Upstash Redis (rate limiting + shift-session locks)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Neon Object Storage (S3-compatible) — replaces Firebase Storage
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_ENDPOINT_URL_S3: z.string().url().optional(),
    AWS_REGION: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),

    // Comma-separated allow-list of emails granted SUPER_ADMIN on first login
    ADMIN_EMAILS: z.string().optional(),

    // App base URL (used by NextAuth and email links)
    AUTH_URL: z.string().url().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3,
    AWS_REGION: process.env.AWS_REGION,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    AUTH_URL: process.env.AUTH_URL,
  },
});