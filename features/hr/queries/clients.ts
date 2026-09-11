import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, guardProfiles } from "@/lib/db/schema";

export type ClientRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  guardCount: number;
  createdAt: Date;
};

/** All clients (for guard-form dropdowns) — active first, then alphabetical. */
export async function listClients() {
  return db
    .select({
      id: clients.id,
      name: clients.name,
      isActive: clients.isActive,
    })
    .from(clients)
    .orderBy(sql`${clients.isActive} DESC`, asc(clients.name));
}

/** Clients with the number of guards currently posted under each. */
export async function listClientsWithCounts(): Promise<ClientRow[]> {
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      description: clients.description,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      guardCount: sql<number>`COUNT(${guardProfiles.id})`.as("guard_count"),
    })
    .from(clients)
    .leftJoin(guardProfiles, eq(guardProfiles.clientId, clients.id))
    .groupBy(clients.id)
    .orderBy(sql`${clients.isActive} DESC`, asc(clients.name));

  return rows.map((r) => ({ ...r, guardCount: Number(r.guardCount) }));
}
