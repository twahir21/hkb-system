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

/** Upload a buffer to Firebase Storage and return its public URL. */
export async function uploadSickNote(
  buffer: Buffer,
  filename: string,
  contentType = "application/pdf"
): Promise<string | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  const bucket = getStorage(app).bucket(env.FIREBASE_STORAGE_BUCKET);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const destination = `sick-notes/${Date.now()}-${safeName}`;
  const file = bucket.file(destination);

  await file.save(buffer, { contentType, resumable: false });
  await file.makePublic();

  return `https://storage.googleapis.com/${env.FIREBASE_STORAGE_BUCKET}/${destination}`;
}