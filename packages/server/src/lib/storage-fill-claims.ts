import {
  nextFillLocation,
  storageLocationHasRoom,
  storageLocationRemainingSlots,
  type ClaimedStorageLocation,
} from "@magic-vault/shared";
import { and, eq, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { bins, binSets, collectionCards, storageLocations } from "../db/schema";
import type { FillLocationRow, FillLocationSqlRow } from "./interfaces/storage-locations";

export async function loadFillLocations(
  tx: Transaction,
  locationIds: number[],
): Promise<Map<number, FillLocationRow>> {
  if (locationIds.length === 0) return new Map();
  const result = await tx.execute(sql`
    SELECT sl.id, sl.guid::text AS guid, sl.name, sl.capacity, sl.batch_size,
      (
        SELECT coalesce(max(cc.location_position), 0)::int
        FROM ${collectionCards} cc
        WHERE cc.location_id = sl.id
      ) AS used_slots
    FROM ${storageLocations} sl
    WHERE sl.id = ANY(${`{${locationIds.join(",")}}`}::int[])
      AND sl.is_deleted = false
  `);
  return new Map(
    (result.rows as unknown as FillLocationSqlRow[]).map((row) => [
      Number(row.id),
      {
        id: Number(row.id),
        guid: row.guid,
        name: row.name,
        capacity: row.capacity,
        batchSize: row.batch_size,
        usedSlots: Number(row.used_slots),
      },
    ]),
  );
}

export function toClaimedStorageLocation(
  location: FillLocationRow | undefined,
): ClaimedStorageLocation | null {
  if (!location) return null;
  return {
    guid: location.guid,
    name: location.name,
    capacity: location.capacity,
    remainingSlots: storageLocationRemainingSlots(location),
  };
}

export async function reclaimFillLocations(
  tx: Transaction,
  binSetId: number,
): Promise<void> {
  const set = await tx.query.binSets.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, binSetId), eq(t.isDeleted, false)),
    columns: { fillStorageLocationIds: true },
  });
  if (!set) return;
  const setBins = await tx.query.bins.findMany({
    where: (t, { eq, and }) =>
      and(eq(t.binSet, binSetId), eq(t.isDeleted, false)),
    columns: {
      id: true,
      binNumber: true,
      isDisabled: true,
      isCatchAll: true,
      claimedStorageLocationId: true,
    },
    orderBy: (t, { asc }) => [asc(t.binNumber)],
  });
  const locations = await loadFillLocations(tx, set.fillStorageLocationIds);
  const orderedLocations = set.fillStorageLocationIds
    .map((id) => locations.get(id))
    .filter((location): location is FillLocationRow => location != null);

  const claimed = new Set<number>();
  const claims = new Map<number, number | null>();
  const canClaim = (bin: (typeof setBins)[number]) => !bin.isDisabled && !bin.isCatchAll;
  for (const bin of setBins) {
    const current = bin.claimedStorageLocationId;
    const location = current == null ? undefined : locations.get(current);
    const keepsClaim =
      canClaim(bin) &&
      location != null &&
      !claimed.has(location.id) &&
      storageLocationHasRoom(location);
    if (keepsClaim) {
      claimed.add(location.id);
      claims.set(bin.id, location.id);
    } else {
      claims.set(bin.id, null);
    }
  }
  for (const bin of setBins) {
    if (!canClaim(bin) || claims.get(bin.id) != null) continue;
    const next = nextFillLocation(orderedLocations, claimed);
    if (!next) break;
    claimed.add(next.id);
    claims.set(bin.id, next.id);
  }

  for (const bin of setBins) {
    const claim = claims.get(bin.id) ?? null;
    if (claim === bin.claimedStorageLocationId) continue;
    await tx
      .update(bins)
      .set({ claimedStorageLocationId: claim, updatedAt: new Date() })
      .where(eq(bins.id, bin.id));
  }
}

export async function reclaimOrgFillLocations(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  const sets = await tx
    .select({ id: binSets.id })
    .from(binSets)
    .where(
      and(
        eq(binSets.orgId, orgId),
        eq(binSets.isDeleted, false),
        sql`cardinality(${binSets.fillStorageLocationIds}) > 0`,
      ),
    );
  for (const set of sets) {
    await reclaimFillLocations(tx, set.id);
  }
}
