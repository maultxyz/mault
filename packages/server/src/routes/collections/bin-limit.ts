import { computeBinCapacity } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import type { Transaction } from "../../db";
import {
  binHeights,
  binSets,
  bins,
  collectionCards,
  devices,
  games,
  unmatchedCards,
} from "../../db/schema";
import type { BinLimitStatus } from "../../lib/interfaces/collections";

export async function findFullBin(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  collectionId: number,
  binNumber: number,
  deviceGuid: string | undefined,
): Promise<BinLimitStatus | null> {
  const result = await tx.execute(sql`
    WITH target AS (
      SELECT b.card_limit, b.last_emptied_at
      FROM ${bins} b
      JOIN ${binSets} s ON s.id = b.bin_set
      WHERE s.is_active
        AND s.org_id = ${orgId}
        AND ${gameId === null ? sql`s.game_id IS NULL` : sql`s.game_id = ${gameId}`}
        AND b.bin_number = ${binNumber}
      LIMIT 1
    )
    SELECT
      t.card_limit,
      (
        SELECT bh.height
        FROM ${binHeights} bh
        WHERE bh.bin_number = ${binNumber}
          AND bh.device_id = (
            SELECT d.id FROM ${devices} d
            WHERE d.org_id = ${orgId}
              ${deviceGuid ? sql`AND d.guid = ${deviceGuid}` : sql``}
            ORDER BY d.id
            LIMIT 1
          )
        LIMIT 1
      ) AS height,
      ${gameId === null ? sql`NULL::double precision` : sql`(SELECT g.card_thickness FROM ${games} g WHERE g.id = ${gameId})`} AS card_thickness,
      (
        SELECT count(*)::int FROM ${collectionCards} c
        WHERE c.collection_id = ${collectionId}
          AND c.bin_number = ${binNumber}
          AND (t.last_emptied_at IS NULL OR c.scanned_at > t.last_emptied_at)
      ) + (
        SELECT count(*)::int FROM ${unmatchedCards} u
        WHERE u.collection_id = ${collectionId}
          AND u.bin_number = ${binNumber}
          AND u.is_deleted = false
          AND (t.last_emptied_at IS NULL OR u.scanned_at > t.last_emptied_at)
      ) AS count
    FROM target t
  `);
  const row = result.rows[0] as
    | {
        card_limit: number | null;
        height: number | null;
        card_thickness: number | null;
        count: number;
      }
    | undefined;
  if (!row) return null;

  const effectiveCapacity = computeBinCapacity(row.height, row.card_thickness);
  if (effectiveCapacity == null) return null;

  const count = Number(row.count);
  if (count < effectiveCapacity) return null;
  return { binNumber, cardLimit: effectiveCapacity, count };
}
