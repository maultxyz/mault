import { planBinStackSlots } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  collectionCards,
  storageLocations,
  unmatchedCards,
} from "../db/schema";
import type {
  AssignBinToLocationInput,
  BinStackLocationRow,
  BinStackRow,
  MoveCardsToLocationInput,
  MoveCollectionToLocationInput,
} from "./interfaces/storage-locations";

export async function assignBinToLocation(
  tx: Transaction,
  { binNumber, collectionId, locationId }: AssignBinToLocationInput,
): Promise<string[]> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`storage_location:${locationId}`}))`,
  );
  const location = await tx.execute(sql`
    SELECT sl.batch_size,
      (
        SELECT coalesce(max(cc.location_position), 0)::int
        FROM ${collectionCards} cc
        WHERE cc.location_id = sl.id
      ) AS used_slots
    FROM ${storageLocations} sl
    WHERE sl.id = ${locationId}
  `);
  const { batch_size: batchSize, used_slots: usedSlots } = (location.rows[0] ?? {
    batch_size: null,
    used_slots: 0,
  }) as BinStackLocationRow;
  const stack = await tx.execute(sql`
    SELECT 'card' AS kind, cc.id, cc.scanned_at, cc.starts_storage_batch
    FROM ${collectionCards} cc
    WHERE cc.collection_id = ${collectionId}
      AND cc.bin_number = ${binNumber}
      AND cc.location_id IS NULL
      AND cc.bin_emptied_at IS NULL
    UNION ALL
    SELECT 'unmatched' AS kind, u.id, u.scanned_at, u.starts_storage_batch
    FROM ${unmatchedCards} u
    WHERE u.collection_id = ${collectionId}
      AND u.bin_number = ${binNumber}
      AND u.is_deleted = false
      AND u.bin_emptied_at IS NULL
    ORDER BY scanned_at DESC, kind DESC, id DESC
  `);
  const stackRows = stack.rows as unknown as BinStackRow[];
  const positions = planBinStackSlots(
    stackRows.map((row) => ({ startsStorageBatch: row.starts_storage_batch })),
    Number(usedSlots),
    batchSize,
  );
  const cardIds: number[] = [];
  const cardPositions: number[] = [];
  stackRows.forEach((row, index) => {
    if (row.kind !== "card") return;
    cardIds.push(Number(row.id));
    cardPositions.push(positions[index]);
  });
  if (cardIds.length === 0) return [];
  const result = await tx.execute(sql`
    UPDATE ${collectionCards} cc
    SET location_id = ${locationId},
        location_position = placed.position
    FROM unnest(
      ${`{${cardIds.join(",")}}`}::int[],
      ${`{${cardPositions.join(",")}}`}::int[]
    ) AS placed(id, position)
    WHERE cc.id = placed.id
    RETURNING cc.guid::text AS scan_id
  `);
  return (result.rows as { scan_id: string }[]).map((row) => row.scan_id);
}

export async function moveCardsToLocation(
  tx: Transaction,
  { orgId, locationId, scanIds }: MoveCardsToLocationInput,
): Promise<string[]> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`storage_location:${locationId}`}))`,
  );
  const result = await tx.execute(sql`
    WITH requested AS (
      SELECT DISTINCT r.id::uuid AS guid
      FROM unnest(${`{${scanIds.join(",")}}`}::text[]) AS r(id)
    ),
    targets AS (
      SELECT cc.id, row_number() OVER (ORDER BY cc.scanned_at, cc.id) AS rn
      FROM ${collectionCards} cc
      JOIN requested ON requested.guid = cc.guid
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      WHERE cc.org_id = ${orgId}
    ),
    base AS (
      SELECT coalesce(max(location_position), 0) AS start
      FROM ${collectionCards}
      WHERE location_id = ${locationId}
    )
    UPDATE ${collectionCards} cc
    SET location_id = ${locationId},
        location_position = base.start + targets.rn
    FROM targets, base
    WHERE cc.id = targets.id
    RETURNING cc.guid::text AS scan_id
  `);
  return (result.rows as { scan_id: string }[]).map((row) => row.scan_id);
}

export async function moveCollectionToLocation(
  tx: Transaction,
  { collectionId, locationId }: MoveCollectionToLocationInput,
): Promise<string[]> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`storage_location:${locationId}`}))`,
  );
  const result = await tx.execute(sql`
    WITH targets AS (
      SELECT cc.id, row_number() OVER (ORDER BY cc.scanned_at, cc.id) AS rn
      FROM ${collectionCards} cc
      WHERE cc.collection_id = ${collectionId}
        AND cc.location_id IS NULL
    ),
    base AS (
      SELECT coalesce(max(location_position), 0) AS start
      FROM ${collectionCards}
      WHERE location_id = ${locationId}
    )
    UPDATE ${collectionCards} cc
    SET location_id = ${locationId},
        location_position = base.start + targets.rn
    FROM targets, base
    WHERE cc.id = targets.id
    RETURNING cc.guid::text AS scan_id
  `);
  return (result.rows as { scan_id: string }[]).map((row) => row.scan_id);
}
