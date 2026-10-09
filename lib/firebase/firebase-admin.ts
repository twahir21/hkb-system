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
 * Follows the exact pattern from the Neon docs:
 *   const s3 = new S3Client({ forcePathStyle: true });
 *
 * The AWS SDK automatically reads these env vars from process.env:
 *   AWS_ACCESS_KEY_ID       — Neon Storage access key
 *   AWS_SECRET_ACCESS_KEY   — Neon Storage secret key
 *   AWS_ENDPOINT_URL_S3     — e.g. https://<account>.storage.neon.tech
 *   AWS_REGION              — e.g. us-east-1 (defaults to us-east-1)
 *
 * Bucket name (optional env var, defaults to "assets"):
 *   STORAGE_BUCKET          — your Neon bucket name
 */

// Match the Neon sample exactly — no explicit credentials/endpoint config.
// The AWS SDK reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// AWS_ENDPOINT_URL_S3 and AWS_REGION from process.env automatically.
const s3 = new S3Client({ forcePathStyle: true });

// Bucket name: use STORAGE_BUCKET env var, fall back to "assets" (Neon default).
function getBucket(): string {
  const bucket = env.STORAGE_BUCKET ?? "assets";
  return bucket;
}

// Whether storage is configured at all (at least the access key must be present).
function isConfigured(): boolean {
  const ok = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
  if (!ok) {
    console.warn(
      "[storage] not configured — missing env var(s):",
      [
        !env.AWS_ACCESS_KEY_ID && "AWS_ACCESS_KEY_ID",
        !env.AWS_SECRET_ACCESS_KEY && "AWS_SECRET_ACCESS_KEY",
      ]
        .filter(Boolean)
        .join(", ")
    );
  }
  return ok;
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
  if (!isConfigured()) return null;

  const bucket = getBucket();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}-${safeName}`;

  console.log(`[storage] uploading — bucket: "${bucket}", key: "${key}", type: ${contentType}`);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (error) {
    console.error("[storage] upload failed:", error);
    return null;
  }

  // Neon Storage public URL format: <endpoint>/<bucket>/<key>
  // AWS_ENDPOINT_URL_S3 is read by the SDK automatically, but we also need it
  // to build the public URL. Fall back to a generic pattern if not set.
  const endpoint = env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "") ?? "";
  const publicUrl = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://storage.neon.tech/${bucket}/${key}`;

  console.log(`[storage] uploaded successfully → ${publicUrl}`);
  return publicUrl;
}

/**
 * Extract the S3 object key from a Neon Storage public URL.
 * e.g. `https://<endpoint>/assets/news/123-x.jpg` → `news/123-x.jpg`
 */
export function storagePathFromUrl(url: string): string | null {
  const bucket = getBucket();
  const endpoint = env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, "") ?? "https://storage.neon.tech";
  const marker = `${endpoint}/${bucket}/`;
  if (!url.startsWith(marker)) return null;
  return decodeURIComponent(url.slice(marker.length));
}

/**
 * Delete an object from Neon Object Storage by its key path or public URL.
 * Idempotent: missing objects / unconfigured storage are silently ignored.
 */
export async function deleteFile(objectPathOrUrl: string | null | undefined): Promise<void> {
  if (!objectPathOrUrl || !isConfigured()) return;

  const key = objectPathOrUrl.startsWith("http")
    ? storagePathFromUrl(objectPathOrUrl)
    : objectPathOrUrl;
  if (!key) return;

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
    console.log(`[storage] deleted object: ${key}`);
  } catch (error) {
    console.warn("[storage] delete skipped (object may not exist):", error);
  }
}