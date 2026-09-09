import { coverageRequestSchema } from "@/lib/validators/schemas";
import { db } from "@/lib/db";
import { coverageRequests } from "@/lib/db/schema";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/request-coverage
 *
 * Public, unauthenticated endpoint used by the marketing website contact /
 * "Request Coverage" forms. Validates the payload, applies a basic per-IP
 * rate limit (Upstash Redis; graceful no-op when unconfigured) and stores the
 * submission as a NEW coverage_request for Super Admin / HR / Bursar.
 */

const MAX_BODY_BYTES = 20 * 1024;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Basic abuse guard: 5 submissions per IP per 10 minutes.
  if (redis) {
    const ip = clientIp(request);
    const key = `rl:coverage:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 600);
      if (count > 5) {
        return Response.json(
          { ok: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    } catch {
      // Redis hiccup — never block a legitimate lead because of it.
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { ok: false, error: "Payload too large." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = coverageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid submission.",
      },
      { status: 400 }
    );
  }

  const { fullName, email, phone, service, message, source } = parsed.data;

  // `submittedAt` from the client is intentionally ignored — the server
  // timestamp (`created_at`) is the source of truth.
  const [row] = await db
    .insert(coverageRequests)
    .values({
      fullName,
      email,
      phone,
      service,
      message,
      source: source || "website-contacts-page",
      status: "NEW",
    })
    .returning({ id: coverageRequests.id });

  // Lightweight event for a future email/in-app alert worker (transfers pattern).
  if (redis) {
    try {
      await redis.publish(
        "coverage-request-events",
        JSON.stringify({ id: row.id, event: "CREATED" })
      );
    } catch {
      // non-critical
    }
  }

  return Response.json({ ok: true, id: row.id }, { status: 201 });
}