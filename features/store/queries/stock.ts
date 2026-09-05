
import "server-only";

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  regions,
  stations,
  stockBalances,
  stockMovements,
  stockTransfers,
  storeItems,
  users,
} from "@/lib/db/schema";

const performer = alias(users, "performed_by");
const receiver = alias(users, "received_by");

export type StationRow = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
};

export async function listRegions() {
  return db.select().from(regions).orderBy(regions.name);
}

export async function listStations(): Promise<StationRow[]> {
  const rows = await db
    .select({
      id: stations.id,
      name: stations.name,
      regionId: stations.regionId,
      regionName: regions.name,
    })
    .from(stations)
    .innerJoin(regions, eq(stations.regionId, regions.id))
    .orderBy(regions.name, stations.name);
  return rows;
}

export async function listItems() {
  return db.select().from(storeItems).orderBy(storeItems.name);
}

export type BalanceRow = {
  itemId: string;
  itemName: string;
  unit: string;
  stationId: string;
  stationName: string;
  regionId: string;
  regionName: string;
  quantity: number;
};

export async function listBalances(): Promise<BalanceRow[]> {
  const rows = await db
    .select({
      itemId: storeItems.id,
      itemName: storeItems.name,
      unit: storeItems.unit,
      stationId: stations.id,
      stationName: stations.name,
      regionId: regions.id,
      regionName: regions.name,
      quantity: stockBalances.quantity,
    })
    .from(stockBalances)
    .innerJoin(storeItems, eq(stockBalances.itemId, storeItems.id))
    .innerJoin(stations, eq(stockBalances.stationId, stations.id))
    .innerJoin(regions, eq(stations.regionId, regions.id))
    .orderBy(regions.name, stations.name, storeItems.name);

  return rows.map((r) => ({ ...r, quantity: Number(r.quantity) }));
}

export type MovementRow = {
  id: string;
  type: (typeof stockMovements.$inferSelect)["type"];
  quantity: number;
  unitCost: string | null;
  reference: string | null;
  reason: string | null;
  createdAt: Date;
  itemName: string;
  unit: string;
  fromStation: string | null;
  toStation: string | null;
  performedBy: string | null;
  receivedBy: string | null;
};

export async function listMovements(filters?: {
  itemId?: string;
  stationId?: string;
  type?: (typeof stockMovements.$inferSelect)["type"];
  from?: string;
  to?: string;
  limit?: number;
}): Promise<MovementRow[]> {
  const conditions = [];
  if (filters?.itemId) conditions.push(eq(stockMovements.itemId, filters.itemId));
  if (filters?.type) conditions.push(eq(stockMovements.type, filters.type));
  if (filters?.from) conditions.push(gte(stockMovements.createdAt, new Date(filters.from)));
  if (filters?.to) {
    const to = new Date(filters.to);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(stockMovements.createdAt, to));
  }
  if (filters?.stationId) {
    conditions.push(
      sql`(${stockMovements.fromStationId} = ${filters.stationId} OR ${stockMovements.toStationId} = ${filters.stationId})`
    );
  }

  const rows = await db
    .select({
      movement: stockMovements,
      itemName: storeItems.name,
      unit: storeItems.unit,
      performedByName: performer.fullName,
      receivedByName: receiver.fullName,
    })
    .from(stockMovements)
    .innerJoin(storeItems, eq(stockMovements.itemId, storeItems.id))
    .leftJoin(performer, eq(stockMovements.performedBy, performer.id))
    .leftJoin(receiver, eq(stockMovements.receivedBy, receiver.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(filters?.limit ?? 200);

  const stationIds = [
    ...new Set(
      rows.flatMap((r) => [r.movement.fromStationId, r.movement.toStationId]).filter(Boolean)
    ),
  ] as string[];
  const stationMap = new Map<string, string>();
  if (stationIds.length) {
    const s = await db
      .select({ id: stations.id, name: stations.name })
      .from(stations)
      .where(inArray(stations.id, stationIds));
    for (const st of s) stationMap.set(st.id, st.name);
  }

  return rows.map((r) => ({
    id: r.movement.id,
    type: r.movement.type,
    quantity: Number(r.movement.quantity),
    unitCost: r.movement.unitCost,
    reference: r.movement.reference,
    reason: r.movement.reason,
    createdAt: r.movement.createdAt,
    itemName: r.itemName,
    unit: r.unit,
    fromStation: r.movement.fromStationId ? stationMap.get(r.movement.fromStationId) ?? "" : null,
    toStation: r.movement.toStationId ? stationMap.get(r.movement.toStationId) ?? "" : null,
    performedBy: r.performedByName ?? null,
    receivedBy: r.receivedByName ?? null,
  }));
}

export type StockTransferRow = {
  id: string;
  status: (typeof stockTransfers.$inferSelect)["status"];
  quantity: number;
  reason: string;
  reviewerNotes: string | null;
  createdAt: Date;
  itemName: string;
  unit: string;
  fromStation: string;
  toStation: string;
  requestedBy: string;
  approvedByName: string | null;
};

export async function listStockTransfers(): Promise<StockTransferRow[]> {
  const fromS = alias(stations, "from_station");
  const toS = alias(stations, "to_station");
  const requester = alias(users, "requester");
  const approver = alias(users, "approver");

  const rows = await db
    .select({
      transfer: stockTransfers,
      itemName: storeItems.name,
      unit: storeItems.unit,
      fromStation: fromS.name,
      toStation: toS.name,
      requestedBy: requester.fullName,
      approvedByName: approver.fullName,
    })
    .from(stockTransfers)
    .innerJoin(storeItems, eq(stockTransfers.itemId, storeItems.id))
    .innerJoin(fromS, eq(stockTransfers.fromStationId, fromS.id))
    .innerJoin(toS, eq(stockTransfers.toStationId, toS.id))
    .leftJoin(requester, eq(stockTransfers.requestedBy, requester.id))
    .leftJoin(approver, eq(stockTransfers.approvedBy, approver.id))
    .orderBy(desc(stockTransfers.createdAt));

  return rows.map((r) => ({
    id: r.transfer.id,
    status: r.transfer.status,
    quantity: Number(r.transfer.quantity),
    reason: r.transfer.reason,
    reviewerNotes: r.transfer.reviewerNotes,
    createdAt: r.transfer.createdAt,
    itemName: r.itemName,
    unit: r.unit,
    fromStation: r.fromStation,
    toStation: r.toStation,
    requestedBy: r.requestedBy ?? "",
    approvedByName: r.approvedByName ?? null,
  }));
}

/**
 * Issued movements that can still be returned — used to populate the
 * "return stock" picker. Outstanding = issued − already returned.
 */
export type OpenIssueRow = {
  movementId: string;
  itemId: string;
  itemName: string;
  unit: string;
  stationId: string;
  stationName: string;
  receivedBy: string | null;
  createdAt: Date;
  issued: number;
  returned: number;
  outstanding: number;
};

export async function listOpenIssues(stationId?: string): Promise<OpenIssueRow[]> {
  const rows = await db
    .select({
      movementId: stockMovements.id,
      itemId: stockMovements.itemId,
      itemName: storeItems.name,
      unit: storeItems.unit,
      stationId: stockMovements.toStationId,
      stationName: stations.name,
      receivedBy: receiver.fullName,
      createdAt: stockMovements.createdAt,
      issued: sql<number>`${stockMovements.quantity}`,
      returnedTotal: sql<number>`COALESCE((
        SELECT SUM(rm.quantity)
        FROM stock_movements rm
        WHERE rm.returned_movement_id = ${stockMovements.id}
      ), 0)`,
    })
    .from(stockMovements)
    .innerJoin(storeItems, eq(stockMovements.itemId, storeItems.id))
    .leftJoin(stations, eq(stockMovements.toStationId, stations.id))
    .leftJoin(receiver, eq(stockMovements.receivedBy, receiver.id))
    .where(
      stationId
        ? and(eq(stockMovements.type, "ISSUED"), eq(stockMovements.toStationId, stationId))
        : eq(stockMovements.type, "ISSUED")
    )
    .orderBy(desc(stockMovements.createdAt))
    .limit(300);

  return rows
    .map((r) => {
      const issued = Number(r.issued);
      const returnedQty = Number(r.returnedTotal);
      return {
        movementId: r.movementId,
        itemId: r.itemId,
        itemName: r.itemName,
        unit: r.unit,
        stationId: r.stationId ?? "",
        stationName: r.stationName ?? "",
        receivedBy: r.receivedBy ?? null,
        createdAt: r.createdAt,
        issued,
        returned: returnedQty,
        outstanding: issued - returnedQty,
      };
    })
    .filter((r) => r.outstanding > 0);
}

/**
 * Per-station report: current holdings plus period sums of issued,
 * lost, returned, handed-out, and purchases (with purchase value).
 */
export type StationReportRow = {
  stationId: string;
  stationName: string;
  regionName: string;
  itemId: string;
  itemName: string;
  unit: string;
  holding: number;
  issued: number;
  lost: number;
  returned: number;
  out: number;
  purchased: number;
  purchaseValue: number;
};

export async function getStationReport(filters?: {
  stationId?: string;
  from?: string;
  to?: string;
}): Promise<StationReportRow[]> {
  const from = filters?.from ? new Date(filters.from) : null;
  const to = filters?.to ? new Date(filters.to) : null;
  if (to) to.setHours(23, 59, 59, 999);

  const period = (col: typeof stockMovements.createdAt) =>
    and(from ? gte(col, from) : undefined, to ? lte(col, to) : undefined);

  const issuedAgg = db
    .select({
      stationId: stockMovements.toStationId,
      itemId: stockMovements.itemId,
      issued: sql<number>`SUM(${stockMovements.quantity})`.as("issued"),
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.type, "ISSUED"), period(stockMovements.createdAt)))
    .groupBy(stockMovements.toStationId, stockMovements.itemId)
    .as("issued_agg");

  const lostAgg = db
    .select({
      stationId: stockMovements.fromStationId,
      itemId: stockMovements.itemId,
      lost: sql<number>`SUM(${stockMovements.quantity})`.as("lost"),
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.type, "LOST"), period(stockMovements.createdAt)))
    .groupBy(stockMovements.fromStationId, stockMovements.itemId)
    .as("lost_agg");

  const returnedAgg = db
    .select({
      stationId: stockMovements.fromStationId,
      itemId: stockMovements.itemId,
      returned: sql<number>`SUM(${stockMovements.quantity})`.as("returned"),
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.type, "RETURNED"), period(stockMovements.createdAt)))
    .groupBy(stockMovements.fromStationId, stockMovements.itemId)
    .as("returned_agg");

  const outAgg = db
    .select({
      stationId: stockMovements.fromStationId,
      itemId: stockMovements.itemId,
      out: sql<number>`SUM(${stockMovements.quantity})`.as("out"),
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.type, "OUT"), period(stockMovements.createdAt)))
    .groupBy(stockMovements.fromStationId, stockMovements.itemId)
    .as("out_agg");

  const purchasedAgg = db
    .select({
      stationId: stockMovements.toStationId,
      itemId: stockMovements.itemId,
      purchased: sql<number>`SUM(${stockMovements.quantity})`.as("purchased"),
      purchaseValue:
        sql<number>`COALESCE(SUM(${stockMovements.quantity} * ${stockMovements.unitCost}), 0)`.as(
          "purchase_value"
        ),
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.type, "IN"), period(stockMovements.createdAt)))
    .groupBy(stockMovements.toStationId, stockMovements.itemId)
    .as("purchased_agg");

  const rows = await db
    .select({
      stationId: stations.id,
      stationName: stations.name,
      regionName: regions.name,
      itemId: storeItems.id,
      itemName: storeItems.name,
      unit: storeItems.unit,
      holding: sql<number>`COALESCE(${stockBalances.quantity}, 0)`,
      issued: sql<number>`COALESCE(${issuedAgg.issued}, 0)`,
      lost: sql<number>`COALESCE(${lostAgg.lost}, 0)`,
      returned: sql<number>`COALESCE(${returnedAgg.returned}, 0)`,
      out: sql<number>`COALESCE(${outAgg.out}, 0)`,
      purchased: sql<number>`COALESCE(${purchasedAgg.purchased}, 0)`,
      purchaseValue: sql<number>`COALESCE(${purchasedAgg.purchaseValue}, 0)`,
    })
    .from(storeItems)
    .crossJoin(stations)
    .innerJoin(regions, eq(stations.regionId, regions.id))
    .leftJoin(
      stockBalances,
      and(eq(stockBalances.itemId, storeItems.id), eq(stockBalances.stationId, stations.id))
    )
    .leftJoin(issuedAgg, and(eq(issuedAgg.stationId, stations.id), eq(issuedAgg.itemId, storeItems.id)))
    .leftJoin(lostAgg, and(eq(lostAgg.stationId, stations.id), eq(lostAgg.itemId, storeItems.id)))
    .leftJoin(
      returnedAgg,
      and(eq(returnedAgg.stationId, stations.id), eq(returnedAgg.itemId, storeItems.id))
    )
    .leftJoin(outAgg, and(eq(outAgg.stationId, stations.id), eq(outAgg.itemId, storeItems.id)))
    .leftJoin(
      purchasedAgg,
      and(eq(purchasedAgg.stationId, stations.id), eq(purchasedAgg.itemId, storeItems.id))
    )
    .where(filters?.stationId ? eq(stations.id, filters.stationId) : undefined)
    .orderBy(regions.name, stations.name, storeItems.name);

  return rows.map((r) => ({
    ...r,
    holding: Number(r.holding),
    issued: Number(r.issued),
    lost: Number(r.lost),
    returned: Number(r.returned),
    out: Number(r.out),
    purchased: Number(r.purchased),
    purchaseValue: Number(r.purchaseValue),
  }));
}




