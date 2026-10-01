/**
 * Shared CORS helpers for public, read-only endpoints consumed cross-origin by
 * the marketing website (hkbprotection.co.tz). Mirrors the allow-list logic used
 * by /api/request-coverage: we echo the exact allow-listed Origin (never `*`)
 * so browser preflights pass, and never leak arbitrary origins.
 */

export const ALLOWED_ORIGINS = new Set<string>([
  "https://hkbprotection.co.tz", // marketing site (apex)
  "https://www.hkbprotection.co.tz", // marketing site (www)
]);

// Optional extra origins (comma-separated) for campaign pages / previews.
for (const origin of (process.env.MARKETING_ALLOWED_ORIGINS ?? "").split(",")) {
  const trimmed = origin.trim();
  if (trimmed) ALLOWED_ORIGINS.add(trimmed);
}

// Local dev origins are only ever trusted outside production.
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3000");
}

/** CORS headers shared by every response from a public route. */
export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin"); // CDN/cache correctness
  }
  return headers;
}

/** JSON response with the CORS headers (and optional cache headers) attached. */
export function corsJson(
  request: Request,
  data: unknown,
  status: number,
  extra?: Record<string, string>
): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  for (const [key, value] of Object.entries(extra ?? {})) headers.set(key, value);
  return new Response(JSON.stringify(data), { status, headers });
}

/** CORS preflight for GET-only public endpoints. */
export function corsPreflight(request: Request): Response {
  const headers = corsHeaders(request);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}
