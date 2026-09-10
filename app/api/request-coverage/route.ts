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
 * "Request Coverage" forms. Cross-origin calls from the marketing site are
 * allowlisted (CORS below). Validates the payload, applies a basic per-IP
 * rate limit (Upstash Redis; graceful no-op when unconfigured) and stores the
 * submission as a NEW coverage_request for Super Admin / HR / Bursar.
 */

// ---------------------------------------------------------------------------
// CORS — the marketing site (hkbprotection.co.tz) posts here cross-origin with
// `Content-Type: application/json`, which forces a browser preflight (OPTIONS).
// We echo the allowlisted request Origin (never `*`) on EVERY response — error
// paths included — otherwise the browser blocks them and the marketing site
// can't even surface our validation / rate-limit messages to the user.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set<string>([
  "https://hkbprotection.co.tz", // marketing site (apex)
  "https://www.hkbprotection.co.tz", // marketing site (www)
]);

// Optional extra origins (comma-separated) for future campaign pages, etc.
for (const origin of (process.env.COVERAGE_ALLOWED_ORIGINS ?? "").split(",")) {
  const trimmed = origin.trim();
  if (trimmed) ALLOWED_ORIGINS.add(trimmed);
}

// Local dev origins are only ever trusted outside production.
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3000");
}

/** CORS headers shared by every response from this route. */
function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) {
    // Deliberately no wildcard: echo the exact allowlisted origin instead.
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin"); // CDN/cache correctness
  }
  return headers;
}

/** JSON response with the CORS headers attached. */
function corsJson(request: Request, data: unknown, status: number): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { status, headers });
}

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
        return corsJson(
          request,
          { ok: false, error: "Too many requests. Please try again later." },
          429
        );
      }
    } catch {
      // Redis hiccup — never block a legitimate lead because of it.
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return corsJson(request, { ok: false, error: "Payload too large." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson(request, { ok: false, error: "Invalid JSON body." }, 400);
  }

  const parsed = coverageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson(
      request,
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid submission.",
      },
      400
    );
  }

  const { fullName, email, phone, service, message, source } = parsed.data;

  // `submittedAt` from the client is intentionally ignored — the server
  // timestamp (`created_at`) is the source of truth.
  try {
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

    return corsJson(request, { ok: true, id: row.id }, 201);
  } catch (error) {
    // Never leak an uncaught 500 — the marketing site needs the CORS echo to
    // be able to read this JSON error body at all.
    console.error("[request-coverage] insert failed:", error);
    return corsJson(
      request,
      {
        ok: false,
        error: "Something went wrong. Please try again or email us directly.",
      },
      500
    );
  }
}

/**
 * CORS preflight. Browsers require this before the cross-origin JSON POST —
 * without it Next answers 405 with only an `Allow` header and no CORS echo,
 * and the whole request dies with "No 'Access-Control-Allow-Origin' header".
 * 204 + CORS headers for allowlisted origins; a bare 204 (no CORS headers)
 * otherwise, so the browser itself blocks disallowed origins.
 */
export async function OPTIONS(request: Request) {
  const headers = corsHeaders(request);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400"); // cache the preflight for a day
  return new Response(null, { status: 204, headers });
}