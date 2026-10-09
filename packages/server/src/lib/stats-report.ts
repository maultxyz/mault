import {
  STATS_PRICE_BUCKETS,
  STATS_RANGE_DAYS,
  STATS_TOP_CARDS_LIMIT,
  STATS_WEEKLY_BUCKET_MIN_DAYS,
  type StatsRange,
  type StatsReport,
} from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import type { Transaction } from "../db";
import { collectionCards, collections, games } from "../db/schema";
import {
  findCardsCollection,
  loadCardStats,
} from "../routes/collections/cards-query";
import { scannedCardPriceSql } from "./card-price-sql";
import { ONE_DAY_MS } from "./constants/timing";
import type { StatsReportRow } from "./interfaces/stats";
import { loadOrgPriceSource } from "./price-source";

function priceBucketsSql(): SQL {
  const buckets = STATS_PRICE_BUCKETS.map(({ key, min, max }) => {
    const upper = max == null ? sql`true` : sql`price < ${max}`;
    return sql`json_build_object(
      'key', ${key}::text,
      'count', (SELECT count(*)::int FROM base WHERE price > 0 AND price >= ${min} AND ${upper}),
      'value', (SELECT COALESCE(sum(price), 0)::float8 FROM base WHERE price > 0 AND price >= ${min} AND ${upper})
    )`;
  });
  return sql`json_build_array(${sql.join(buckets, sql`, `)})`;
}

export async function loadStatsReport(
  tx: Transaction,
  orgId: string,
  range: StatsRange,
  collectionGuid: string | null,
): Promise<StatsReport | null> {
  const collection = collectionGuid
    ? await findCardsCollection(tx, collectionGuid, orgId)
    : null;
  if (collectionGuid && !collection) return null;

  const priceSource = await loadOrgPriceSource(tx, orgId);
  const cardPrice = scannedCardPriceSql(priceSource);
  const days = STATS_RANGE_DAYS[range];
  const bucket = days >= STATS_WEEKLY_BUCKET_MIN_DAYS ? "week" : "day";
  const unit = sql.raw(`'${bucket}'`);
  const step = sql.raw(`'1 ${bucket}'`);
  const since = new Date(Date.now() - (days - 1) * ONE_DAY_MS);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const inRange = sql`created_at >= ${sinceIso}::timestamp`;
  const isoTimestamp = sql.raw(`'YYYY-MM-DD"T"HH24:MI:SS"Z"'`);

  const scope = collection
    ? sql`${collections.id} = ${collection.id}`
    : sql`${collections.orgId} = ${orgId} AND ${collections.isDeleted} = false`;

  const result = await tx.execute(sql`
    WITH base AS MATERIALIZED (
      SELECT
        ${collectionCards.guid}::text AS scan_id,
        ${collectionCards.card} AS card,
        ${collectionCards.cardId} AS card_id,
        ${collectionCards.isFoil} AS is_foil,
        ${collectionCards.needsReview} AS needs_review,
        ${collectionCards.isCorrected} AS is_corrected,
        ${collectionCards.alternativeMatches} AS alternative_matches,
        ${collectionCards.createdAt} AS created_at,
        ${collectionCards.scannedAt} AS scanned_at,
        ${collections.id} AS collection_id,
        ${collections.guid}::text AS collection_guid,
        ${collections.name} AS collection_name,
        ${games.key} AS game_key,
        ${games.name} AS game_name,
        (${cardPrice})::float8 AS price
      FROM ${collectionCards}
      JOIN ${collections} ON ${collections.id} = ${collectionCards.collectionId}
      LEFT JOIN ${games} ON ${games.id} = ${collections.gameId}
      WHERE ${scope}
    )
    SELECT
      json_build_object(
        'cardCount', (SELECT count(*)::int FROM base),
        'uniqueCount', (SELECT count(DISTINCT card_id)::int FROM base),
        'totalValue', (SELECT COALESCE(sum(price) FILTER (WHERE price > 0), 0)::float8 FROM base),
        'avgValue', (SELECT COALESCE(avg(price) FILTER (WHERE price > 0), 0)::float8 FROM base),
        'priceableCount', (SELECT (count(*) FILTER (WHERE price > 0))::int FROM base),
        'foilCount', (SELECT (count(*) FILTER (WHERE is_foil))::int FROM base),
        'needsReviewCount', (SELECT (count(*) FILTER (WHERE NOT is_corrected AND (needs_review OR (jsonb_typeof(alternative_matches) = 'array' AND jsonb_array_length(alternative_matches) > 0))))::int FROM base),
        'correctedCount', (SELECT (count(*) FILTER (WHERE is_corrected))::int FROM base),
        'scansInRange', (SELECT (count(*) FILTER (WHERE ${inRange}))::int FROM base),
        'valueAddedInRange', (SELECT COALESCE(sum(price) FILTER (WHERE price > 0 AND ${inRange}), 0)::float8 FROM base)
      ) AS totals,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'start', to_char(s.bucket, 'YYYY-MM-DD'),
          'count', COALESCE(a.count, 0),
          'value', COALESCE(a.value, 0)
        ) ORDER BY s.bucket), '[]'::json)
        FROM generate_series(
          date_trunc(${unit}, ${sinceIso}::timestamp),
          date_trunc(${unit}, now() AT TIME ZONE 'UTC'),
          ${step}::interval
        ) AS s(bucket)
        LEFT JOIN (
          SELECT date_trunc(${unit}, created_at) AS bucket,
            count(*)::int AS count,
            COALESCE(sum(price) FILTER (WHERE price > 0), 0)::float8 AS value
          FROM base WHERE ${inRange}
          GROUP BY 1
        ) a ON a.bucket = s.bucket
      ) AS activity,
      ${priceBucketsSql()} AS price_buckets,
      (
        SELECT COALESCE(json_agg(t), '[]'::json) FROM (
          SELECT scan_id AS "scanId", collection_guid AS "collectionGuid",
            collection_name AS "collectionName", card, is_foil AS "isFoil",
            price, to_char(scanned_at, ${isoTimestamp}) AS "scannedAt"
          FROM base WHERE price > 0
          ORDER BY price DESC, scanned_at DESC
          LIMIT ${STATS_TOP_CARDS_LIMIT}
        ) t
      ) AS top_cards,
      (
        SELECT COALESCE(json_agg(r ORDER BY r."totalValue" DESC, r.name), '[]'::json) FROM (
          SELECT ${collections.guid}::text AS guid, ${collections.name} AS name,
            ${games.name} AS "gameName",
            count(b.scan_id)::int AS "cardCount",
            count(DISTINCT b.card_id)::int AS "uniqueCount",
            COALESCE(sum(b.price) FILTER (WHERE b.price > 0), 0)::float8 AS "totalValue",
            COALESCE(avg(b.price) FILTER (WHERE b.price > 0), 0)::float8 AS "avgValue",
            (count(b.scan_id) FILTER (WHERE b.created_at >= ${sinceIso}::timestamp))::int AS "scansInRange",
            COALESCE(sum(b.price) FILTER (WHERE b.price > 0 AND b.created_at >= ${sinceIso}::timestamp), 0)::float8 AS "valueAddedInRange",
            to_char(max(b.created_at), ${isoTimestamp}) AS "lastScanAt"
          FROM ${collections}
          LEFT JOIN ${games} ON ${games.id} = ${collections.gameId}
          LEFT JOIN base b ON b.collection_id = ${collections.id}
          WHERE ${scope}
          GROUP BY ${collections.id}, ${collections.guid}, ${collections.name}, ${games.name}
        ) r
      ) AS collections,
      (
        SELECT COALESCE(json_agg(g ORDER BY g."totalValue" DESC), '[]'::json) FROM (
          SELECT game_key AS key, game_name AS name,
            count(*)::int AS "cardCount",
            COALESCE(sum(price) FILTER (WHERE price > 0), 0)::float8 AS "totalValue"
          FROM base GROUP BY game_key, game_name
        ) g
      ) AS games
  `);
  const row = result.rows[0] as unknown as StatsReportRow;

  const breakdown = collection
    ? (await loadCardStats(tx, collection, sql`true`, priceSource)).all
    : null;

  return {
    scope: collection ? "collection" : "org",
    range,
    bucket,
    totals: { ...row.totals, collectionCount: row.collections.length },
    activity: row.activity,
    priceBuckets: STATS_PRICE_BUCKETS.map((definition, index) => ({
      key: definition.key,
      min: definition.min,
      max: definition.max,
      count: row.price_buckets[index]?.count ?? 0,
      value: row.price_buckets[index]?.value ?? 0,
    })),
    topCards: row.top_cards,
    collections: row.collections,
    games: row.games,
    breakdown,
  };
}
