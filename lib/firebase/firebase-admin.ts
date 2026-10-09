import "server-only";

import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { env } from "@/lib/env";

/**
 * Firebase Admin SDK — server-side only. Never exposed to the client.
 * Returns null when Firebase env vars are absent (local dev without storage).
 */

/**
 * Normalize the FIREBASE_PRIVATE_KEY environment variable into a valid PEM
 * string that OpenSSL / the Firebase Admin SDK can parse.
 *
 * Hosting platforms encode the key differently:
 *  1. Already valid PEM   — real newlines present, no escaping needed.
 *  2. JSON-stringified    — the whole value is wrapped in `"…"`.
 *  3. Double-escaped      — literal \\n (4 chars) instead of \n (2 chars).
 *  4. Single-escaped      — literal \n (2 chars) — the most common case.
 *
 * We try each strategy in order and log which one produced a well-formed PEM
 * so any future key-rotation issues are immediately diagnosable in the logs.
 */
function normalizePrivateKey(raw: string): string {
  // Strategy 1 — already a valid PEM (real newlines, no escaping needed).
  if (raw.includes("-----BEGIN")) {
    console.log("[firebase] private key: already contains PEM header — using as-is");
    return raw;
  }

  // Strategy 2 — JSON-stringified key (starts with a quote character).
  if (raw.startsWith('"') || raw.startsWith("'")) {
    try {
      const jsonInput = raw.startsWith("'") ? `"${raw.slice(1, -1)}"` : raw;
      const parsed: unknown = JSON.parse(jsonInput);
      if (typeof parsed === "string" && parsed.includes("-----BEGIN")) {
        console.log("[firebase] private key: decoded via JSON.parse — OK");
        return parsed;
      }
    } catch {
      // fall through to next strategy
    }
  }

  // Strategy 3 — double-escaped newlines (\\\\n in raw = \\n after JS string parsing).
  const doubleUnescaped = raw.replace(/\\\\n/g, "\n");
  if (doubleUnescaped.includes("-----BEGIN")) {
    console.log("[firebase] private key: decoded via double-unescape (\\\\n → \\n) — OK");
    return doubleUnescaped;
  }

  // Strategy 4 — single-escaped newlines (the most common hosting-platform format).
  const singleUnescaped = raw.replace(/\\n/g, "\n");
  if (singleUnescaped.includes("-----BEGIN")) {
    console.log("[firebase] private key: decoded via single-unescape (\\n → newline) — OK");
    return singleUnescaped;
  }

  // Nothing worked — log enough detail to diagnose and return the best-effort value.
  console.error(
    "[firebase] private key: could not find PEM header after all decode strategies.\n" +
      `Key prefix (first 60 chars): ${raw.slice(0, 60).replace(/\n/g, "\\n")}\n` +
      "Fix: check how FIREBASE_PRIVATE_KEY is stored in your hosting environment."
  );
  return singleUnescaped;
}

let cached: { app: App } | null = null;

function getFirebaseApp() {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    console.warn(
      "[firebase] skipping init — missing env var(s):",
      [
        !env.FIREBASE_PROJECT_ID && "FIREBASE_PROJECT_ID",
        !env.FIREBASE_CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
        !env.FIREBASE_PRIVATE_KEY && "FIREBASE_PRIVATE_KEY",
      ]
        .filter(Boolean)
        .join(", ")
    );
    return null;
  }

  if (cached) return cached.app;

  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);

  const apps = getApps();
  const app =
    apps.length > 0
      ? apps[0]
      : initializeApp({
          projectId: env.FIREBASE_PROJECT_ID,
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          storageBucket: env.FIREBASE_STORAGE_BUCKET,
        });

  cached = { app };
  console.log(`[firebase] app initialized — project: ${env.FIREBASE_PROJECT_ID}`);
  return app;
}

/**
 * Upload a buffer to Firebase Storage and return its public URL.
 * `folder` groups objects by feature (sick-notes, news, ...). Defaults to the
 * historical "sick-notes" prefix so existing callers keep working unchanged.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType = "application/pdf",
  folder = "sick-notes"
): Promise<string | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  const bucket = getStorage(app).bucket(env.FIREBASE_STORAGE_BUCKET);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const destination = `${folder}/${Date.now()}-${safeName}`;
  const file = bucket.file(destination);

  await file.save(buffer, { contentType, resumable: false });
  try {
    // With uniform bucket-level access, objects are already public via IAM and
    // makePublic() throws — never fail an upload because of that.
    await file.makePublic();
  } catch (error) {
    console.warn("[firebase] makePublic skipped (bucket may be public via IAM):", error);
  }

  return `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${destination}`;
}

/**
 * Extract the bucket object path from a Firebase Storage public URL.
 * e.g. `https://storage.googleapis.com/<bucket>/news/123-x.jpg` → `news/123-x.jpg`
 */
export function storagePathFromUrl(url: string): string | null {
  if (!env.FIREBASE_STORAGE_BUCKET) return null;
  const marker = `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/`;
  if (!url.startsWith(marker)) return null;
  return decodeURIComponent(url.slice(marker.length));
}

/**
 * Delete an object from Firebase Storage by its bucket path or public URL.
 * Idempotent: missing objects / unconfigured storage are silently ignored.
 */
export async function deleteFile(objectPathOrUrl: string | null | undefined): Promise<void> {
  if (!objectPathOrUrl) return;
  const app = getFirebaseApp();
  if (!app) return;

  const path = objectPathOrUrl.startsWith("http")
    ? storagePathFromUrl(objectPathOrUrl)
    : objectPathOrUrl;
  if (!path) return;

  try {
    await getStorage(app).bucket(env.FIREBASE_STORAGE_BUCKET).file(path).delete();
  } catch (error) {
    console.warn("[firebase] delete skipped (object may not exist):", error);
  }
}