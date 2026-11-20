import type { CardStatsAggregate, OrgPricing } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { db, singleStatementDb } from "../db";
import { collectionCardStats, collectionCardStatsDirty } from "../db/schema";
import { loadAllCardStats } from "../routes/collections/cards-query";
import {
  COLLECTION_CARD_STATS_ADVISORY_LOCK_NAME,
  COLLECTION_CARD_STATS_STALE_KEY,
} from "./constants/stored-snapshots";
import type { CatalogJoinScope } from "./interfaces/saved-cards";
import type {
  StoredSnapshotRead,
  StoredSnapshotRow,
} from "./interfaces/stored-snapshots";
import {
  clearDirtyMarksUnderLock,
  readStoredSnapshot,
  toStoredSnapshot,
  utcTimestampTextSql,
} from "./stored-snapshots";

export function readStoredCardStats(
  collection: CatalogJoinScope & { id: number },
  pricing: OrgPricing,
): Promise<StoredSnapshotRead<CardStatsAggregate>> {
  const pricingKey = JSON.stringify(pricing);
  return readStoredSnapshot<CardStatsAggregate>({
    stateKey: `collection:${collection.id}`,
    pricingKey,
    staleKey: COLLECTION_CARD_STATS_STALE_KEY,
    loadStored: async () => {
      const result = await singleStatementDb.execute(sql`
        SELECT s.stats AS payload, s.pricing_key,
          ${COLLECTION_CARD_STATS_STALE_KEY}::text AS stale_key,
          ${utcTimestampTextSql(sql`s.compute_started_at`)} AS compute_started_at,
          s.compute_duration_ms,
          (extract(epoch FROM (clock_timestamp() - s.compute_started_at)) * 1000)::float8 AS age_ms,
          EXISTS (
            SELECT 1 FROM ${collectionCardStatsDirty} d WHERE d.collection_id = s.collection_id
          ) AS is_dirty
        FROM ${collectionCardStats} s
        WHERE s.collection_id = ${collection.id}
      `);
      return toStoredSnapshot<CardStatsAggregate>(
        result.rows[0] as unknown as StoredSnapshotRow | undefined,
      );
    },
    clearDirtyMarks: () =>
      clearDirtyMarksUnderLock(
        sql`hashtext(${COLLECTION_CARD_STATS_ADVISORY_LOCK_NAME}), ${collection.id}::int`,
        sql`DELETE FROM ${collectionCardStatsDirty} WHERE ${collectionCardStatsDirty.collectionId} = ${collection.id}`,
      ),
    markDirty: async () => {
      await db.execute(
        sql`INSERT INTO ${collectionCardStatsDirty} (collection_id) VALUES (${collection.id})`,
      );
    },
    compute: () =>
      db.transaction((tx) => loadAllCardStats(tx, collection, pricing)),
    store: async (stats, computeStartedAt, computeDurationMs) => {
      await db.execute(sql`
        INSERT INTO ${collectionCardStats}
          (collection_id, stats, pricing_key, compute_started_at, compute_duration_ms)
        VALUES (${collection.id}, ${JSON.stringify(stats)}::jsonb, ${pricingKey},
          ${computeStartedAt}::timestamptz, ${computeDurationMs})
        ON CONFLICT (collection_id) DO UPDATE SET
          stats = excluded.stats,
          pricing_key = excluded.pricing_key,
          compute_started_at = excluded.compute_started_at,
          compute_duration_ms = excluded.compute_duration_ms
        WHERE ${collectionCardStats}.compute_started_at < excluded.compute_started_at
      `);
    },
  });
}
