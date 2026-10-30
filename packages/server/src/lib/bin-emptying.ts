import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import { bins, collectionCards, unmatchedCards } from "../db/schema";

export async function markBinsEmptied(
  tx: Transaction,
  orgId: string,
  binNumbers: number[],
): Promise<void> {
  if (binNumbers.length === 0) return;
  const emptiedAt = new Date();
  await tx
    .update(collectionCards)
    .set({ binEmptiedAt: emptiedAt })
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        inArray(collectionCards.binNumber, binNumbers),
        isNull(collectionCards.binEmptiedAt),
      ),
    );
  await tx
    .update(unmatchedCards)
    .set({ binEmptiedAt: emptiedAt })
    .where(
      and(
        eq(unmatchedCards.orgId, orgId),
        inArray(unmatchedCards.binNumber, binNumbers),
        isNull(unmatchedCards.binEmptiedAt),
      ),
    );
}

export async function loadBinEmptiedTimes(
  tx: Transaction,
  orgId: string,
): Promise<Map<number, number>> {
  const result = await tx.execute(sql`
    SELECT b.bin_number,
      (extract(epoch from greatest(
        (SELECT max(cc.bin_emptied_at) FROM ${collectionCards} cc
          WHERE cc.org_id = ${orgId} AND cc.bin_number = b.bin_number),
        (SELECT max(u.bin_emptied_at) FROM ${unmatchedCards} u
          WHERE u.org_id = ${orgId} AND u.bin_number = b.bin_number)
      )) * 1000)::float8 AS emptied_at_ms
    FROM (
      SELECT DISTINCT bin_number FROM ${bins}
      WHERE org_id = ${orgId} AND is_deleted = false
    ) b
  `);
  const emptiedTimes = new Map<number, number>();
  for (const row of result.rows as {
    bin_number: number;
    emptied_at_ms: number | null;
  }[]) {
    if (row.emptied_at_ms != null) {
      emptiedTimes.set(Number(row.bin_number), Number(row.emptied_at_ms));
    }
  }
  return emptiedTimes;
}

export function lateSaveBinEmptiedAtSql(
  orgId: string,
  binNumber: number | null | undefined,
  scannedAtMs: number,
): SQL | null {
  if (binNumber == null) return null;
  return sql`(
    SELECT CASE
      WHEN latest.emptied_at > to_timestamp(${scannedAtMs} / 1000.0) AT TIME ZONE 'UTC'
      THEN latest.emptied_at
    END
    FROM (
      SELECT greatest(
        (SELECT max(cc.bin_emptied_at) FROM ${collectionCards} cc
          WHERE cc.org_id = ${orgId} AND cc.bin_number = ${binNumber}),
        (SELECT max(u.bin_emptied_at) FROM ${unmatchedCards} u
          WHERE u.org_id = ${orgId} AND u.bin_number = ${binNumber})
      ) AS emptied_at
    ) latest
  )`;
}
