import "server-only";

import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Upstash Redis client. Returns null when not configured (local dev) so
 * rate limiting / shift locks degrade gracefully instead of crashing.
 */
function createClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const redis = createClient();

/** Claim a short-lived lock for (guardId,date,shift) to prevent duplicate clock-ins. */
export async function tryAcquireShiftLock(
  key: string,
  ttlSeconds = 300
): Promise<boolean> {
  if (!redis) return true; // no-op when Redis unconfigured
  const ok = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  return ok === "OK";
}

export async function releaseShiftLock(key: string) {
  if (!redis) return;
  await redis.del(key);
}