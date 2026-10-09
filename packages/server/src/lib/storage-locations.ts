import { sql } from "drizzle-orm";
import type { Transaction } from "../db";
import { bins, collectionCards, unmatchedCards } from "../db/schema";
import type { AssignBinToLocationInput } from "./interfaces/storage-locations";

export async function assignBinToLocation(
  tx: Transaction,
  { binId, binNumber, collectionId, locationId }: AssignBinToLocationInput,
): Promise<string[]> {
  const result = await tx.execute(sql`
    WITH emptied AS (
      SELECT last_emptied_at FROM ${bins} WHERE id = ${binId}
    ),
    stack AS (
      SELECT 'card' AS kind, cc.id, cc.scanned_at
      FROM ${collectionCards} cc, emptied e
      WHERE cc.collection_id = ${collectionId}
        AND cc.bin_number = ${binNumber}
        AND cc.location_id IS NULL
        AND (e.last_emptied_at IS NULL OR cc.scanned_at > e.last_emptied_at)
      UNION ALL
      SELECT 'unmatched' AS kind, u.id, u.scanned_at
      FROM ${unmatchedCards} u, emptied e
      WHERE u.collection_id = ${collectionId}
        AND u.bin_number = ${binNumber}
        AND u.is_deleted = false
        AND (e.last_emptied_at IS NULL OR u.scanned_at > e.last_emptied_at)
    ),
    numbered AS (
      SELECT kind, id, row_number() OVER (ORDER BY scanned_at, kind, id) AS rn
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
