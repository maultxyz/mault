import { sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards, unmatchedCards } from "../db/schema";
import type {
  AssignBinToLocationInput,
  MoveCardsToLocationInput,
  MoveCollectionToLocationInput,
} from "./interfaces/storage-locations";

export async function assignBinToLocation(
  tx: Transaction,
  { binNumber, collectionId, locationId }: AssignBinToLocationInput,
): Promise<string[]> {
  const result = await tx.execute(sql`
    WITH stack AS (
      SELECT 'card' AS kind, cc.id, cc.scanned_at
      FROM ${collectionCards} cc
      WHERE cc.collection_id = ${collectionId}
        AND cc.bin_number = ${binNumber}
        AND cc.location_id IS NULL
        AND cc.bin_emptied_at IS NULL
      UNION ALL
      SELECT 'unmatched' AS kind, u.id, u.scanned_at
      FROM ${unmatchedCards} u
      WHERE u.collection_id = ${collectionId}
        AND u.bin_number = ${binNumber}
        AND u.is_deleted = false
        AND u.bin_emptied_at IS NULL
    ),
    numbered AS (
      SELECT kind, id, row_number() OVER (ORDER BY scanned_at DESC, kind DESC, id DESC) AS rn
      FROM stack
    ),
    base AS (
      SELECT coalesce(max(location_position), 0) AS start
      FROM ${collectionCards}
      WHERE location_id = ${locationId}
    )
    UPDATE ${collectionCards} cc
    SET location_id = ${locationId},
        location_position = base.start + numbered.rn
    FROM numbered, base
    WHERE numbered.kind = 'card' AND cc.id = numbered.id
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
      SELECT r.id::uuid AS guid, r.ord
      FROM unnest(${`{${scanIds.join(",")}}`}::text[]) WITH ORDINALITY AS r(id, ord)
    ),
    targets AS (
      SELECT cc.id, row_number() OVER (ORDER BY requested.ord) AS rn
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
