import "server-only";

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

/** Appends an audit-log row for a privileged/compliance-relevant action. */
export async function writeAuditLog({
  actorId,
  action,
  entity,
  entityId,
  metadata,
}: {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorId: actorId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}