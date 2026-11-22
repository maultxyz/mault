import { sql } from "drizzle-orm";
import { db, singleStatementDb } from "../db";
import { orgCardStats, orgCardStatsDirty } from "../db/schema";
import { ORG_CARD_STATS_ADVISORY_LOCK_NAME } from "./constants/stored-snapshots";
import type {
  StoredOrgCardStatsInput,
  StoredSnapshotRead,
  StoredSnapshotRow,
} from "./interfaces/stored-snapshots";
import {
  clearDirtyMarksUnderLock,
  readStoredSnapshot,
  toStoredSnapshot,
  utcTimestampTextSql,
} from "./stored-snapshots";

export function readStoredOrgCardStats<Payload>({
  orgId,
  variant,
  pricingKey,
  day,
  compute,
}: StoredOrgCardStatsInput<Payload>): Promise<StoredSnapshotRead<Payload>> {
  return readStoredSnapshot<Payload>({
    stateKey: `org\u0000${orgId}\u0000${variant}`,
    pricingKey,
    staleKey: day,
    loadStored: async () => {
      const result = await singleStatementDb.execute(sql`
        SELECT s.payload, s.pricing_key, s.day AS stale_key,
          ${utcTimestampTextSql(sql`s.compute_started_at`)} AS compute_started_at,
          s.compute_duration_ms,
          (extract(epoch FROM (clock_timestamp() - s.compute_started_at)) * 1000)::float8 AS age_ms,
          (
            COALESCE(s.invalidated_at > s.compute_started_at, false)
            OR EXISTS (SELECT 1 FROM ${orgCardStatsDirty} d WHERE d.org_id = s.org_id)
          ) AS is_dirty
        FROM ${orgCardStats} s
        WHERE s.org_id = ${orgId} AND s.variant = ${variant}
      `);
      return toStoredSnapshot<Payload>(
        result.rows[0] as unknown as StoredSnapshotRow | undefined,
      );
    },
    clearDirtyMarks: () =>
      clearDirtyMarksUnderLock(
        sql`hashtext(${ORG_CARD_STATS_ADVISORY_LOCK_NAME}), hashtext(${orgId})`,
        sql`
          WITH cleared AS (
            DELETE FROM ${orgCardStatsDirty}
            WHERE ${orgCardStatsDirty.orgId} = ${orgId}
            RETURNING 1
          )
          UPDATE ${orgCardStats} SET invalidated_at = clock_timestamp()
          WHERE org_id = ${orgId} AND EXISTS (SELECT 1 FROM cleared)
        `,
      ),
    markDirty: async () => {
      await db.execute(
        sql`INSERT INTO ${orgCardStatsDirty} (org_id) VALUES (${orgId})`,
      );
    },
    compute,
    store: async (payload, computeStartedAt, computeDurationMs) => {
      await db.execute(sql`
        INSERT INTO ${orgCardStats}
          (org_id, variant, payload, pricing_key, day, compute_started_at, compute_duration_ms)
        VALUES (${orgId}, ${variant}, ${JSON.stringify(payload)}::jsonb, ${pricingKey}, ${day},
          ${computeStartedAt}::timestamptz, ${computeDurationMs})
        ON CONFLICT (org_id, variant) DO UPDATE SET
          payload = excluded.payload,
          pricing_key = excluded.pricing_key,
          day = excluded.day,
          compute_started_at = excluded.compute_started_at,
          compute_duration_ms = excluded.compute_duration_ms
        WHERE ${orgCardStats}.compute_started_at < excluded.compute_started_at
      `);
    },
  });
}
