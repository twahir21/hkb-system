import { redis } from "@/lib/redis";
import {
  processJobApplicationSubmission,
  type JobApplicationState,
} from "@/features/jobs/lib/submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/job-applications
 *
 * Public, unauthenticated endpoint used by the marketing website
 * (www.hkbprotection.co.tz /jobs page) to submit a job application
 * (Nafasi za Ajira). Cross-origin calls are allowlisted (CORS below), the
 * multipart payload is validated and stored by the shared pipeline in
 * features/jobs/lib/submit.ts — exactly the same code path as the
 * `submitJobApplication` server action.
 *
 * Response body always mirrors the action's state shape:
 *   { ok, message?, error?, fieldErrors?, url? }
 */

// ---------------------------------------------------------------------------
// CORS — the marketing site posts here cross-origin (multipart/form-data),
// which forces a browser preflight (OPTIONS). We echo the allowlisted request
// Origin (never `*`) on EVERY response — error paths included — otherwise the
// browser blocks them and the marketing site can't surface our validation /
// rate-limit messages to the applicant.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set<string>([
  "https://hkbprotection.co.tz", // marketing site (apex)
  "https://www.hkbprotection.co.tz", // marketing site (www)
]);

// Optional extra origins (comma-separated) for future campaign pages, etc.
for (const origin of (process.env.JOB_APPLICATION_ALLOWED_ORIGINS ?? "").split(",")) {
  const trimmed = origin.trim();
  if (trimmed) ALLOWED_ORIGINS.add(trimmed);
}

// Local dev origins are only ever trusted outside production.
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://localhost:3999");
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

// Six documents up to 2 MB each + the textual payload.
const MAX_BODY_BYTES = 20 * 1024 * 1024;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  // Abuse guard: 5 submissions per IP per 10 minutes (same bucket as the
  // server action, so both entry points share one budget per applicant).
  if (redis) {
    const ip = clientIp(request);
    const key = `rl:job-application:${ip}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 600);
      if (count > 5) {
        return corsJson(
          request,
          {
            ok: false,
            error:
              "Maombi mengi sana kutoka kwenye kifaa hiki. Tafadhali jaribu tena baada ya dakika 10.",
          },
          429
        );
      }
    } catch {
      // Redis hiccup — never block a legitimate applicant because of it.
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return corsJson(
      request,
      { ok: false, error: "Faili ni kubwa mno (jumla ya viambatanisho ni MB 20)." },
      413
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return corsJson(
      request,
      { ok: false, error: "Invalid multipart/form-data payload." },
      400
    );
  }

  let result: JobApplicationState;
  try {
    result = await processJobApplicationSubmission(formData);
  } catch (error) {
    // Never leak an uncaught 500 — the marketing site needs the CORS echo to
    // be able to read this JSON error body at all.
    console.error("[job-applications] submission failed:", error);
    return corsJson(
      request,
      {
        ok: false,
        error:
          "Imeshindikana kutuma maombi yako. Tafadhali jaribu tena baadaye au piga simu ofisini.",
      },
      500
    );
  }

  if (result.ok) return corsJson(request, result, 201);
  // Per-field problems are the applicant's to fix (400); everything else is an
  // internal failure (upload / database).
  return corsJson(request, result, result.fieldErrors ? 400 : 500);
}

/**
 * CORS preflight. Browsers require this before the cross-origin POST —
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
