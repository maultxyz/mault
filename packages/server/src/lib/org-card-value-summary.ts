import {
  ORG_OVERVIEW_TOP_CARDS_LIMIT,
  WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  WIDGET_SUMMARY_REVIEW_CARDS_LIMIT,
  WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION,
  type OrgPricing,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { authQuery, type Transaction } from "../db";
import { cardPrices, collectionCards, collections, games } from "../db/schema";
import {
  collectionCardPriceRiseSql,
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import {
  HOME_READ_CACHE_MAX_ENTRIES,
  ORG_CARD_VALUE_SUMMARY_CACHE_TTL_MS,
} from "./constants/home-read-caches";
import type {
  OrgCardValueSummary,
  OrgCardValueSummaryRow,
} from "./interfaces/org-card-value-summary";
import { inventoryCardSql } from "./inventory-sql";
import { createOrgReadCache } from "./org-read-cache";
import { loadOrgPricing } from "./price-source";

const orgCardValueSummaryCache = createOrgReadCache<OrgCardValueSummary>(
  ORG_CARD_VALUE_SUMMARY_CACHE_TTL_MS,
  HOME_READ_CACHE_MAX_ENTRIES,
);

export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function loadOrgCardValueSummaryRow(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  day: string,
): Promise<OrgCardValueSummaryRow> {
  const cardPrice = collectionCardPriceSql(pricing);
  const priceChange = collectionCardPriceRiseSql(pricing);
  const isTopCard = sql`(ranked.price IS NOT NULL AND ranked.top_rank <= ${WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION})`;
  const isBiggestPriceRise = sql`COALESCE(ranked.rise_rank = 1 AND ranked.price_change > 0, false)`;
  const isBiggestPriceDrop = sql`COALESCE(ranked.drop_rank = 1 AND ranked.price_change < 0, false)`;
  const isInDailyShuffle = sql`(ranked.day_rank <= ${WIDGET_SUMMARY_CARDS_OF_THE_DAY})`;
  const result = await tx.execute(sql`
    WITH base AS MATERIALIZED (
      SELECT
        ${collectionCards.guid}::text AS scan_id,
        ${collectionCards.collectionId} AS collection_id,
        ${collectionCards.scannedAt} AS scanned_at,
        (${cardPrice})::float8 AS price,
        (${priceChange})::float8 AS price_change,
        md5(${collectionCards.guid}::text || ${day}) AS daily_shuffle,
        (
          (${collectionCards.lowConfidenceMatch} OR ${collectionCards.hasAlternativeMatches})
          AND NOT ${collectionCards.isCorrected}
          AND NOT ${collectionCards.isReviewed}
        ) AS needs_review,
        ${inventoryCardSql()} AS is_inventory
      FROM ${collectionCards}
      JOIN ${collections} ON ${collections.id} = ${collectionCards.collectionId}
      LEFT JOIN ${games} ON ${games.id} = ${collections.gameId}
      LEFT JOIN ${cardPrices} ON ${collectionCardPricesJoinOn()}
      WHERE ${collectionCards.orgId} = ${orgId}
        AND ${collections.orgId} = ${orgId}
        AND ${collections.isDeleted} = false
    ),
    inventory AS MATERIALIZED (
      SELECT * FROM base WHERE is_inventory
    ),
    ranked AS (
      SELECT scan_id, collection_id, price, price_change,
        row_number() OVER (PARTITION BY collection_id ORDER BY price DESC NULLS LAST) AS top_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY price_change DESC NULLS LAST, daily_shuffle) AS rise_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY price_change ASC NULLS LAST, daily_shuffle) AS drop_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY daily_shuffle) AS day_rank
      FROM inventory
      WHERE scan_id IS NOT NULL
    )
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'guid', live.guid::text,
          'name', live.name,
          'cardCount', COALESCE(totals.card_count, 0),
          'value', totals.value
        )), '[]'::json)
        FROM collections live
        LEFT JOIN (
          SELECT collection_id, count(*)::int AS card_count, sum(price)::float8 AS value
          FROM inventory
          GROUP BY collection_id
        ) totals ON totals.collection_id = live.id
        WHERE live.org_id = ${orgId} AND live.is_deleted = false
      ) AS collection_values,
      (
        SELECT COALESCE(json_agg(top.scan_id ORDER BY top.price DESC), '[]'::json)
        FROM (
          SELECT scan_id, price FROM inventory
          WHERE price IS NOT NULL AND scan_id IS NOT NULL
          ORDER BY price DESC
          LIMIT ${ORG_OVERVIEW_TOP_CARDS_LIMIT}
        ) top
      ) AS top_card_scan_ids,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'scanId', ranked.scan_id,
          'collectionGuid', picked.guid::text,
          'isTopCard', ${isTopCard},
          'isBiggestPriceRise', ${isBiggestPriceRise},
          'isBiggestPriceDrop', ${isBiggestPriceDrop},
          'isInDailyShuffle', ${isInDailyShuffle},
          'dayRank', ranked.day_rank
        )), '[]'::json)
        FROM ranked
        JOIN collections picked ON picked.id = ranked.collection_id
        WHERE ${isTopCard} OR ${isBiggestPriceRise} OR ${isBiggestPriceDrop} OR ${isInDailyShuffle}
      ) AS collection_picks,
      (
        SELECT scan_id FROM inventory
        WHERE price_change > 0 AND scan_id IS NOT NULL
        ORDER BY price_change DESC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_rise_scan_id,
      (
        SELECT scan_id FROM inventory
        WHERE price_change < 0 AND scan_id IS NOT NULL
        ORDER BY price_change ASC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_drop_scan_id,
      (
        SELECT COALESCE(json_agg(shuffled.scan_id ORDER BY shuffled.daily_shuffle), '[]'::json)
        FROM (
          SELECT scan_id, daily_shuffle FROM inventory
          WHERE scan_id IS NOT NULL
          ORDER BY daily_shuffle
          LIMIT ${WIDGET_SUMMARY_CARDS_OF_THE_DAY}
        ) shuffled
      ) AS org_daily_shuffle_scan_ids,
      (SELECT count(*)::int FROM base WHERE needs_review) AS needs_review_count,
      (
        SELECT COALESCE(json_agg(review.scan_id ORDER BY review.scanned_at DESC), '[]'::json)
        FROM (
          SELECT scan_id, scanned_at FROM base
          WHERE needs_review AND scan_id IS NOT NULL
          ORDER BY scanned_at DESC
          LIMIT ${WIDGET_SUMMARY_REVIEW_CARDS_LIMIT}
        ) review
      ) AS review_scan_ids
  `);
  return result.rows[0] as unknown as OrgCardValueSummaryRow;
}

export function loadCachedOrgCardValueSummary(
  jwtClaims: string,
  orgId: string,
): Promise<OrgCardValueSummary> {
  const day = utcDayKey();
  return orgCardValueSummaryCache.get(orgId, day, () =>
    authQuery(jwtClaims, async (tx) => {
      const pricing = await loadOrgPricing(tx, orgId);
      const row = await loadOrgCardValueSummaryRow(tx, orgId, pricing, day);
      return { ...row, pricing, day };
    }),
  );
}
