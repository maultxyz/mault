import {
  STORAGE_LOCATION_NAME_MAX_LENGTH,
  type StorageLocation,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards, storageLocations } from "../../db/schema";
import type { StorageLocationRow } from "../../lib/interfaces/storage-locations";
import { loadOrgPriceSource } from "../../lib/price-source";
import { cardPriceSql } from "../collections/cards-query";

export function parseLocationName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > STORAGE_LOCATION_NAME_MAX_LENGTH) return null;
  return name;
}

export async function locationNameTaken(
  tx: Transaction,
  orgId: string,
  name: string,
  excludeGuid?: string,
): Promise<boolean> {
  const existing = await tx.query.storageLocations.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.orgId, orgId), sql`lower(${t.name}) = ${name.toLowerCase()}`),
    columns: { guid: true },
  });
  return !!existing && existing.guid !== excludeGuid;
}

export async function loadLocations(
  tx: Transaction,
  orgId: string,
): Promise<StorageLocation[]> {
  const priceSource = await loadOrgPriceSource(tx, orgId);
  const result = await tx.execute(sql`
    SELECT sl.guid, sl.name, sl.created_at,
      count(cc.id)::int AS card_count,
      COALESCE(sum(${cardPriceSql(priceSource)}) FILTER (WHERE cc.id IS NOT NULL), 0)::float8 AS total_value
    FROM ${storageLocations} sl
    LEFT JOIN ${collectionCards} cc ON cc.location_id = sl.id
    WHERE sl.org_id = ${orgId}
    GROUP BY sl.id
    ORDER BY sl.name
  `);
  return (result.rows as unknown as StorageLocationRow[]).map((r) => ({
    guid: r.guid,
    name: r.name,
    createdAt: new Date(r.created_at),
    cardCount: Number(r.card_count),
    totalValue: Number(r.total_value),
  }));
}
