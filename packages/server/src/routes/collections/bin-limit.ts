import { computeBinCapacity } from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
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
import type {
  BinFill,
  BinFillSqlInput,
  BinLimitStatus,
} from "../../lib/interfaces/collections";

export function binFillSql({
  orgId,
  gameId,
  collectionId,
  binNumber,
  deviceGuid,
}: BinFillSqlInput): SQL {
  return sql`(
    SELECT json_build_object(
      'height', (
        SELECT bh.height
        FROM ${binHeights} bh
        WHERE bh.bin_number = ${binNumber}
          AND bh.is_deleted = false
          AND bh.device_id = (
            SELECT d.id FROM ${devices} d
            WHERE d.org_id = ${orgId}
              AND d.is_deleted = false
              ${deviceGuid ? sql`AND d.guid = ${deviceGuid}` : sql``}
            ORDER BY d.id
            LIMIT 1
          )
        LIMIT 1
      ),
      'card_thickness', (SELECT g.card_thickness FROM ${games} g WHERE g.id = ${gameId}),
      'count', (
        SELECT count(*)::int FROM ${collectionCards} c
        WHERE c.collection_id = ${collectionId}
          AND c.bin_number = ${binNumber}
          AND c.bin_emptied_at IS NULL
          AND c.location_id IS NULL
      ) + (
        SELECT count(*)::int FROM ${unmatchedCards} u
        WHERE u.collection_id = ${collectionId}
          AND u.bin_number = ${binNumber}
          AND u.is_deleted = false
          AND u.bin_emptied_at IS NULL
      )
    )
    FROM ${bins} b
    JOIN ${binSets} s ON s.id = b.bin_set
    WHERE s.is_active
      AND s.is_deleted = false
      AND b.is_deleted = false
      AND s.org_id = ${orgId}
      AND s.game_id IS NOT DISTINCT FROM ${gameId}
      AND b.bin_number = ${binNumber}
    LIMIT 1
  )`;
}

export function fullBinFromFill(
  binNumber: number,
  fill: BinFill | null,
): BinLimitStatus | null {
  if (!fill) return null;
  const effectiveCapacity = computeBinCapacity(fill.height, fill.card_thickness);
  if (effectiveCapacity == null) return null;
  const count = Number(fill.count);
  if (count < effectiveCapacity) return null;
  return { binNumber, capacity: effectiveCapacity, count };
}

export async function findFullBin(
  tx: Transaction,
  orgId: string,
  gameId: number | null,
  collectionId: number,
  binNumber: number,
  deviceGuid: string | undefined,
): Promise<BinLimitStatus | null> {
  const result = await tx.execute(sql`
    SELECT ${binFillSql({
      orgId,
      gameId: sql`${gameId}::int`,
      collectionId: sql`${collectionId}`,
      binNumber,
      deviceGuid,
    })} AS bin_fill
  `);
  const row = result.rows[0] as { bin_fill: BinFill | null } | undefined;
  return fullBinFromFill(binNumber, row?.bin_fill ?? null);
}
