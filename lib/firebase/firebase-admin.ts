import "server-only";

import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { env } from "@/lib/env";

/**
 * Firebase Admin SDK — server-side only. Never exposed to the client.
 * Returns null when Firebase env vars are absent (local dev without storage).
 */
let cached: { app: App } | null = null;

function getFirebaseApp() {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  if (cached) return cached.app;

  const apps = getApps();
  const app =
    apps.length > 0
      ? apps[0]
      : initializeApp({
          projectId: env.FIREBASE_PROJECT_ID,
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
          storageBucket: env.FIREBASE_STORAGE_BUCKET,
        });

  cached = { app };
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