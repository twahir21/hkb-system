"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { stockBalances, stockMovements, stockTransfers } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/auth/audit";
import {
  movementSchema,
  stockTransferActionSchema,
  stockTransferSchema,
} from "@/features/store/validators/store.schema";
import type { ActionState } from "@/features/attendance/actions/attendance.actions";

export type { ActionState } from "@/features/attendance/actions/attendance.actions";

type MovementInsert = typeof stockMovements.$inferInsert;

/** Increment a station's balance (creates the row if missing). */
async function incrementBalance(
  itemId: string,
  stationId: string,
  quantity: number
) {
  await db
    .insert(stockBalances)
    .values({ itemId, stationId, quantity })
    .onConflictDoUpdate({
      target: [stockBalances.itemId, stockBalances.stationId],
      set: {
        quantity: sql`${stockBalances.quantity} + ${quantity}`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Decrement a station's balance. The WHERE clause guarantees the balance
 * never goes negative — returns false when the station doesn't hold
 * enough stock (Neon HTTP driver has no interactive transactions, so
 * atomicity is enforced via this conditional update instead).
 */
async function decrementBalance(
  itemId: string,
  stationId: string,
  quantity: number
): Promise<boolean> {
  const rows = await db
    .update(stockBalances)
    .set({ quantity: sql`${stockBalances.quantity} - ${quantity}`, updatedAt: new Date() })
    .where(
      and(
        eq(stockBalances.itemId, itemId),
        eq(stockBalances.stationId, stationId),
        sql`${stockBalances.quantity} >= ${quantity}`
      )
    )
    .returning({ id: stockBalances.id });
  return rows.length > 0;
}

const revalidateStorePaths = () => {
  revalidatePath("/store");
  revalidatePath("/store/ledger");
  revalidatePath("/store/reports");
  revalidatePath("/store/transfers");
  revalidatePath("/dashboard");
};

/** Record a purchase (IN) into a station / main store. */
export async function recordPurchase(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_RECORD");

  const parsed = movementSchema.safeParse({
    itemId: formData.get("itemId") ?? undefined,
    type: "IN",
    quantity: formData.get("quantity") ?? undefined,
    toStationId: formData.get("toStationId") ?? undefined,
    unitCost: formData.get("unitCost") || undefined,
    reference: formData.get("reference") || undefined,
    receivedById: formData.get("receivedById") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid purchase" };
  }
  const v = parsed.data;

  await incrementBalance(v.itemId, v.toStationId!, v.quantity);
  const [movement] = await db
    .insert(stockMovements)
    .values({
      itemId: v.itemId,
      type: "IN",
      quantity: v.quantity,
      toStationId: v.toStationId,
      unitCost: v.unitCost !== undefined ? String(v.unitCost) : null,
      reference: v.reference ?? null,
      performedBy: actor.userId,
      receivedBy: v.receivedById ?? null,
    })
    .returning();

  await writeAuditLog({
    actorId: actor.userId,
    action: "STOCK_PURCHASE",
    entity: "stock_movements",
    entityId: movement.id,
    metadata: { itemId: v.itemId, quantity: v.quantity, toStationId: v.toStationId, unitCost: v.unitCost },
  });

  revalidateStorePaths();
  return { ok: true, message: "Stock purchased and recorded." };
}

/** Issue (give) stock from one station/storekeeper to another. */
export async function issueStock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_RECORD");

  const parsed = movementSchema.safeParse({
    itemId: formData.get("itemId") ?? undefined,
    type: "ISSUED",
    quantity: formData.get("quantity") ?? undefined,
    fromStationId: formData.get("fromStationId") ?? undefined,
    toStationId: formData.get("toStationId") ?? undefined,
    reason: formData.get("reason") || undefined,
    receivedById: formData.get("receivedById") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid issue" };
  }
  const v = parsed.data;

  const ok = await decrementBalance(v.itemId, v.fromStationId!, v.quantity);
  if (!ok) {
    return { ok: false, error: "Not enough stock at the source station." };
  }
  await incrementBalance(v.itemId, v.toStationId!, v.quantity);

  const [movement] = await db
    .insert(stockMovements)
    .values({
      itemId: v.itemId,
      type: "ISSUED",
      quantity: v.quantity,
      fromStationId: v.fromStationId,
      toStationId: v.toStationId,
      reason: v.reason ?? null,
      performedBy: actor.userId,
      receivedBy: v.receivedById ?? null,
    })
    .returning();

  await writeAuditLog({
    actorId: actor.userId,
    action: "STOCK_ISSUED",
    entity: "stock_movements",
    entityId: movement.id,
    metadata: {
      itemId: v.itemId,
      quantity: v.quantity,
      fromStationId: v.fromStationId,
      toStationId: v.toStationId,
      receivedBy: v.receivedById,
    },
  });

  revalidateStorePaths();
  return { ok: true, message: "Stock issued." };
}

/** Return stock from a station/storekeeper back to a source station. */
export async function returnStock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_RECORD");

  const parsed = movementSchema.safeParse({
    itemId: formData.get("itemId") ?? undefined,
    type: "RETURNED",
    quantity: formData.get("quantity") ?? undefined,
    fromStationId: formData.get("fromStationId") ?? undefined,
    toStationId: formData.get("toStationId") || undefined,
    returnedMovementId: formData.get("returnedMovementId") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid return" };
  }
  const v = parsed.data;

  const ok = await decrementBalance(v.itemId, v.fromStationId!, v.quantity);
  if (!ok) {
    return { ok: false, error: "Not enough stock at the returning station." };
  }
  if (v.toStationId) {
    await incrementBalance(v.itemId, v.toStationId, v.quantity);
  }

  const [movement] = await db
    .insert(stockMovements)
    .values({
      itemId: v.itemId,
      type: "RETURNED",
      quantity: v.quantity,
      fromStationId: v.fromStationId,
      toStationId: v.toStationId ?? null,
      returnedMovementId: v.returnedMovementId ?? null,
      reason: v.reason ?? null,
      performedBy: actor.userId,
    })
    .returning();

  await writeAuditLog({
    actorId: actor.userId,
    action: "STOCK_RETURNED",
    entity: "stock_movements",
    entityId: movement.id,
    metadata: {
      itemId: v.itemId,
      quantity: v.quantity,
      fromStationId: v.fromStationId,
      returnedMovementId: v.returnedMovementId,
    },
  });

  revalidateStorePaths();
  return { ok: true, message: "Stock return recorded." };
}

/** Record lost stock (or a hand-out to end users) with a mandatory reason. */
export async function recordLossOrOut(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_RECORD");

  const parsed = movementSchema.safeParse({
    itemId: formData.get("itemId") ?? undefined,
    type: formData.get("type") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    fromStationId: formData.get("fromStationId") ?? undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid record" };
  }
  const v = parsed.data;
  if (v.type !== "LOST" && v.type !== "OUT" && v.type !== "ADJUSTMENT") {
    return { ok: false, error: "Only LOST, OUT or ADJUSTMENT movements are allowed here." };
  }

  const ok = await decrementBalance(v.itemId, v.fromStationId!, v.quantity);
  if (!ok) {
    return { ok: false, error: "Not enough stock at the station." };
  }

  const [movement] = await db
    .insert(stockMovements)
    .values({
      itemId: v.itemId,
      type: v.type,
      quantity: v.quantity,
      fromStationId: v.fromStationId,
      reason: v.reason ?? null,
      performedBy: actor.userId,
    } satisfies MovementInsert)
    .returning();

  await writeAuditLog({
    actorId: actor.userId,
    action: `STOCK_${v.type}`,
    entity: "stock_movements",
    entityId: movement.id,
    metadata: { itemId: v.itemId, quantity: v.quantity, fromStationId: v.fromStationId, reason: v.reason },
  });

  revalidateStorePaths();
  return { ok: true, message: `Stock ${v.type.toLowerCase()} recorded.` };
}

/** Request a stock transfer between stations (pending approval). */
export async function requestStockTransfer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_TRANSFER_INITIATE");

  const parsed = stockTransferSchema.safeParse({
    itemId: formData.get("itemId") ?? undefined,
    fromStationId: formData.get("fromStationId") ?? undefined,
    toStationId: formData.get("toStationId") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer" };
  }
  const v = parsed.data;

  const [request] = await db
    .insert(stockTransfers)
    .values({ ...v, requestedBy: actor.userId, status: "PENDING" })
    .returning();

  await writeAuditLog({
    actorId: actor.userId,
    action: "STOCK_TRANSFER_REQUEST",
    entity: "stock_transfers",
    entityId: request.id,
    metadata: { ...v },
  });

  revalidateStorePaths();
  return { ok: true, message: "Transfer request submitted." };
}

/** Approve or reject a pending stock transfer. Approval moves the stock. */
export async function approveOrRejectStockTransfer(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requirePermission("STOCK_TRANSFER_APPROVE");

  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Missing request id" };

  const parsed = stockTransferActionSchema.safeParse({
    action: formData.get("action") ?? undefined,
    reviewerNotes: formData.get("reviewerNotes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid action" };
  }
  const { action, reviewerNotes } = parsed.data;

  const request = await db.query.stockTransfers.findFirst({
    where: eq(stockTransfers.id, id),
  });
  if (!request) return { ok: false, error: "Transfer request not found." };
  if (request.status !== "PENDING") {
    return { ok: false, error: "Transfer already processed." };
  }

  if (action === "APPROVE") {
    const ok = await decrementBalance(request.itemId, request.fromStationId, request.quantity);
    if (!ok) {
      return {
        ok: false,
        error: "Source station no longer holds enough stock for this transfer.",
      };
    }
    await incrementBalance(request.itemId, request.toStationId, request.quantity);
    await db.insert(stockMovements).values({
      itemId: request.itemId,
      type: "TRANSFER",
      quantity: request.quantity,
      fromStationId: request.fromStationId,
      toStationId: request.toStationId,
      transferId: request.id,
      performedBy: actor.userId,
    });
  }

  await db
    .update(stockTransfers)
    .set({
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewerNotes: reviewerNotes ?? null,
      approvedBy: actor.userId,
      updatedAt: new Date(),
    })
    .where(eq(stockTransfers.id, id));

  await writeAuditLog({
    actorId: actor.userId,
    action: "STOCK_TRANSFER_" + action,
    entity: "stock_transfers",
    entityId: id,
    metadata: { reviewerNotes: reviewerNotes ?? null },
  });

  revalidateStorePaths();
  return { ok: true, message: `Transfer ${action.toLowerCase()}d.` };
}


