import {
  STORAGE_LOCATION_NAME_MAX_LENGTH,
  type StorageLocation,
} from "@magic-vault/shared";
import { asc, count, eq, sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import { collectionCards, storageLocations } from "../../db/schema";

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
  const rows = await tx
    .select({
      guid: storageLocations.guid,
      name: storageLocations.name,
      createdAt: storageLocations.createdAt,
      cardCount: count(collectionCards.id),
    })
    .from(storageLocations)
    .leftJoin(
      collectionCards,
      eq(collectionCards.locationId, storageLocations.id),
    )
    .where(eq(storageLocations.orgId, orgId))
    .groupBy(storageLocations.id)
    .orderBy(asc(storageLocations.name));
  return rows.map((r) => ({
    guid: r.guid!,
    name: r.name,
    createdAt: r.createdAt,
    cardCount: Number(r.cardCount),
  }));
}
