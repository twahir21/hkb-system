import "server-only";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * Neon Object Storage (S3-compatible) — server-side only.
 *
 * Drop-in replacement for the old Firebase Admin Storage module.
 * All exported function signatures are identical so every caller
 * (features/jobs, features/news, features/attendance, …) compiles
 * without changes.
 *
 * Required env vars (set in hosting platform + .env.local for dev):
 *   AWS_ACCESS_KEY_ID       — Neon Storage access key
 *   AWS_SECRET_ACCESS_KEY   — Neon Storage secret key
 *   AWS_ENDPOINT_URL_S3     — e.g. https://storage.neon.tech
 *   AWS_REGION              — e.g. us-east-1  (or your Neon region)
 *   STORAGE_BUCKET          — Neon bucket name, e.g. "assets"
 */

let cachedClient: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.AWS_ENDPOINT_URL_S3 ||
    !env.STORAGE_BUCKET
  ) {
    console.warn(
      "[storage] skipping init — missing env var(s):",
      [
        !env.AWS_ACCESS_KEY_ID && "AWS_ACCESS_KEY_ID",
        !env.AWS_SECRET_ACCESS_KEY && "AWS_SECRET_ACCESS_KEY",
        !env.AWS_ENDPOINT_URL_S3 && "AWS_ENDPOINT_URL_S3",
        !env.STORAGE_BUCKET && "STORAGE_BUCKET",
      ]
        .filter(Boolean)
        .join(", ")
    );
    return null;
  }

  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: env.AWS_REGION ?? "us-east-1",
    endpoint: env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true, // required for Neon / MinIO-style S3
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log(
    `[storage] S3 client initialized — endpoint: ${env.AWS_ENDPOINT_URL_S3}, bucket: ${env.STORAGE_BUCKET}`
  );
  return cachedClient;
}

/**
 * Upload a buffer to Neon Object Storage and return its public URL.
 *
 * @param buffer      - file contents
 * @param filename    - original filename (sanitized before storage)
 * @param contentType - MIME type, defaults to "application/pdf"
 * @param folder      - storage prefix / virtual folder, e.g. "job-applications"
 * @returns public URL string, or null when storage is not configured
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType = "application/pdf",
  folder = "sick-notes"
): Promise<string | null> {
  const client = getS3Client();
  if (!client || !env.STORAGE_BUCKET) return null;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;

  console.log(
    `[storage] uploading to bucket "${env.STORAGE_BUCKET}" at key "${key}" (${contentType})`
  );

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Objects are publicly readable — matches the old Firebase behaviour.
        ACL: "public-read",
      })
    );
  } catch (error) {
    console.error("[storage] upload failed:", error);
    return null;
  }

  // Construct the public URL.
  // Neon Storage serves objects at: <endpoint>/<bucket>/<key>
  const publicUrl = `${env.AWS_ENDPOINT_URL_S3}/${env.STORAGE_BUCKET}/${key}`;
  console.log(`[storage] uploaded successfully → ${publicUrl}`);
  return publicUrl;
}

/**
 * Extract the S3 object key from a Neon Storage public URL.
 * e.g. `https://storage.neon.tech/assets/news/123-x.jpg` → `news/123-x.jpg`
 */
export function storagePathFromUrl(url: string): string | null {
  if (!env.AWS_ENDPOINT_URL_S3 || !env.STORAGE_BUCKET) return null;
  const marker = `${env.AWS_ENDPOINT_URL_S3}/${env.STORAGE_BUCKET}/`;
  if (!url.startsWith(marker)) return null;
  return decodeURIComponent(url.slice(marker.length));
}

/**
 * Delete an object from Neon Object Storage by its key path or public URL.
 * Idempotent: missing objects / unconfigured storage are silently ignored.
 */
export async function deleteFile(objectPathOrUrl: string | null | undefined): Promise<void> {
  if (!objectPathOrUrl) return;
  const client = getS3Client();
  if (!client || !env.STORAGE_BUCKET) return;

  const key = objectPathOrUrl.startsWith("http")
    ? storagePathFromUrl(objectPathOrUrl)
    : objectPathOrUrl;
  if (!key) return;

  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key })
    );
    console.log(`[storage] deleted object: ${key}`);
  } catch (error) {
    console.warn("[storage] delete skipped (object may not exist):", error);
  }
}