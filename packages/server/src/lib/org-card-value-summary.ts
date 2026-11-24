import {
  ORG_OVERVIEW_TOP_CARDS_LIMIT,
  WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  WIDGET_SUMMARY_REVIEW_CARDS_LIMIT,
  WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION,
  type OrgPricing,
} from "@magic-vault/shared";
import { sql, type SQL } from "drizzle-orm";
import { authQuery, type Transaction } from "../db";
import {
  cardLastPriceDaySql,
  cardPriceMoveOnDaySql,
  hasCurrentFoilPriceSql,
  joinedScannedCardPriceSql,
} from "./card-price-sql";
import {
  INVENTORY_GROUP_ALIAS,
  INVENTORY_GROUP_KEY_COLUMNS,
  INVENTORY_GROUP_SQL_COLUMNS,
} from "./constants/card-prices";
import {
  ORG_CARD_VALUE_SUMMARY_VARIANT,
  ORG_WIDGET_PICKS_VARIANT,
} from "./constants/stored-snapshots";
import type {
  OrgCardValueSummary,
  OrgCardValueSummaryRow,
  OrgWidgetPicks,
  OrgWidgetPicksRow,
} from "./interfaces/org-card-value-summary";
import type { CardPriceMoveColumns } from "./interfaces/card-prices";
import type { StoredSnapshotRead } from "./interfaces/stored-snapshots";
import { inventoryCardSql } from "./inventory-sql";
import { readStoredOrgCardStats, refreshStoredOrgCardStats } from "./org-card-stats";
import { loadOrgPricing } from "./price-source";

export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function liveCollectionsCteSql(orgId: string): SQL {
  return sql`live AS MATERIALIZED (
    SELECT c.id, c.guid, c.name, c.lang, g.key AS game_key
    FROM collections c
    LEFT JOIN games g ON g.id = c.game_id
    WHERE c.org_id = ${orgId} AND c.is_deleted = false
  )`;
}

function inventoryRowsOfGroupJoinSql(groupAlias: string): SQL {
  const group = sql.raw(groupAlias);
  const matches = INVENTORY_GROUP_KEY_COLUMNS.filter(
    (column) => column !== "collection_id" && column !== "card_id",
  ).map((column) => sql.raw(`cc.${column} IS NOT DISTINCT FROM ${groupAlias}.${column}`));
  return sql`JOIN collection_cards cc
    ON cc.collection_id = ${group}.collection_id
    AND cc.card_id = ${group}.card_id
    AND ${sql.join(matches, sql` AND `)}
    AND cc.guid IS NOT NULL
    AND ${inventoryCardSql(sql`cc.intake_lot_id`)}`;
}

function pricedInventoryGroupsCtesSql(orgId: string, pricing: OrgPricing): SQL {
  const keyColumns = sql.raw(INVENTORY_GROUP_KEY_COLUMNS.map((column) => `cc.${column}`).join(", "));
  const groupAlias = sql.raw(INVENTORY_GROUP_ALIAS);
  const price = joinedScannedCardPriceSql(pricing, INVENTORY_GROUP_SQL_COLUMNS, "cp");
  return sql`
    ${liveCollectionsCteSql(orgId)},
    inventory_groups AS MATERIALIZED (
      SELECT ${keyColumns}, count(*)::int AS copies
      FROM collection_cards cc
      JOIN live ON live.id = cc.collection_id
      WHERE cc.org_id = ${orgId} AND ${inventoryCardSql(sql`cc.intake_lot_id`)}
      GROUP BY ${keyColumns}
    ),
    inventory_card_keys AS MATERIALIZED (
      SELECT DISTINCT live.game_key, COALESCE(${groupAlias}.card_lang, live.lang) AS lang, ${groupAlias}.card_id
      FROM inventory_groups ${groupAlias}
      JOIN live ON live.id = ${groupAlias}.collection_id
    ),
    inventory_card_prices AS MATERIALIZED (
      SELECT cp.*
      FROM inventory_card_keys k
      JOIN card_prices cp ON cp.game_key = k.game_key AND cp.lang = k.lang AND cp.card_id = k.card_id
    ),
    priced_groups AS MATERIALIZED (
      SELECT ${groupAlias}.*, (${price})::float8 AS price,
        cp.game_key AS price_game_key, cp.lang AS price_lang, cp.card_id AS price_card_id,
        ${hasCurrentFoilPriceSql(pricing, "cp")} AS has_current_foil_price
      FROM inventory_groups ${groupAlias}
      JOIN live ON live.id = ${groupAlias}.collection_id
      LEFT JOIN inventory_card_prices cp
        ON cp.game_key = live.game_key
        AND cp.lang = COALESCE(${groupAlias}.card_lang, live.lang)
        AND cp.card_id = ${groupAlias}.card_id
    )`;
}

async function loadOrgCardValueSummaryRow(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
): Promise<OrgCardValueSummaryRow> {
  const result = await tx.execute(sql`
    WITH ${pricedInventoryGroupsCtesSql(orgId, pricing)},
    collection_totals AS (
      SELECT collection_id, sum(copies)::int AS card_count, sum(price * copies)::float8 AS value
      FROM priced_groups
      GROUP BY collection_id
    ),
    top_groups AS (
      SELECT * FROM priced_groups
      WHERE price IS NOT NULL
      ORDER BY price DESC
      LIMIT ${ORG_OVERVIEW_TOP_CARDS_LIMIT}
    )
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'guid', live.guid::text,
          'name', live.name,
          'cardCount', COALESCE(totals.card_count, 0),
          'value', totals.value
        )), '[]'::json)
        FROM live
        LEFT JOIN collection_totals totals ON totals.collection_id = live.id
      ) AS collection_values,
      (
        SELECT COALESCE(json_agg(top.scan_id ORDER BY top.price DESC), '[]'::json)
        FROM (
          SELECT cc.guid::text AS scan_id, top_group.price
          FROM top_groups top_group
          ${inventoryRowsOfGroupJoinSql("top_group")}
          ORDER BY top_group.price DESC
          LIMIT ${ORG_OVERVIEW_TOP_CARDS_LIMIT}
        ) top
      ) AS top_card_scan_ids
  `);
  return result.rows[0] as unknown as OrgCardValueSummaryRow;
}

async function loadOrgCardValueSummaryWithoutValues(
  tx: Transaction,
  orgId: string,
): Promise<OrgCardValueSummaryRow> {
  const result = await tx.execute(sql`
    WITH ${liveCollectionsCteSql(orgId)}
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'guid', live.guid::text,
          'name', live.name,
          'cardCount', COALESCE(totals.card_count, 0),
          'value', NULL
        )), '[]'::json)
        FROM live
        LEFT JOIN (
          SELECT cc.collection_id, count(*)::int AS card_count
          FROM collection_cards cc
          JOIN live ON live.id = cc.collection_id
          WHERE cc.org_id = ${orgId} AND ${inventoryCardSql(sql`cc.intake_lot_id`)}
          GROUP BY cc.collection_id
        ) totals ON totals.collection_id = live.id
      ) AS collection_values,
      '[]'::json AS top_card_scan_ids
  `);
  return result.rows[0] as unknown as OrgCardValueSummaryRow;
}

function pickedRowOfBestGroupSql(cteName: string, aggregate: "max" | "min", comparison: SQL, day: string): SQL {
  return sql`${sql.raw(cteName)} AS (
    SELECT DISTINCT ON (best_group.collection_id)
      best_group.collection_id, cc.guid::text AS scan_id, best_group.price_change,
      md5(cc.guid::text || ${day}) AS daily_shuffle
    FROM (
      SELECT collection_id, ${sql.raw(aggregate)}(price_change) AS price_change
      FROM moved_groups
      WHERE ${comparison}
      GROUP BY collection_id
    ) best
    JOIN moved_groups best_group
      ON best_group.collection_id = best.collection_id AND best_group.price_change = best.price_change
    ${inventoryRowsOfGroupJoinSql("best_group")}
    ORDER BY best_group.collection_id, md5(cc.guid::text || ${day})
  )`;
}

function priceMoveColumnsOf(alias: string): CardPriceMoveColumns {
  const column = (name: string) => sql.raw(`${alias}.${name}`);
  return {
    gameKey: column("price_game_key"),
    lang: column("price_lang"),
    cardId: column("price_card_id"),
    isFoil: column("is_foil"),
    condition: column("condition"),
    hasCurrentFoilPrice: column("has_current_foil_price"),
  };
}

async function loadOrgWidgetPicksRow(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  day: string,
): Promise<OrgWidgetPicksRow> {
  const priceMoveOnLatestUpdate = cardPriceMoveOnDaySql(
    pricing,
    priceMoveColumnsOf("priced_group_days"),
    sql`latest_price_update.day`,
  );
  const result = await tx.execute(sql`
    WITH ${pricedInventoryGroupsCtesSql(orgId, pricing)},
    priced_group_days AS MATERIALIZED (
      SELECT priced_groups.*,
        ${cardLastPriceDaySql(priceMoveColumnsOf("priced_groups"), day)} AS last_price_day
      FROM priced_groups
    ),
    latest_price_update AS (
      SELECT max(last_price_day) AS day FROM priced_group_days
    ),
    moved_groups AS MATERIALIZED (
      SELECT priced_group_days.*,
        CASE WHEN priced_group_days.last_price_day = latest_price_update.day
          THEN (${priceMoveOnLatestUpdate})::float8
        END AS price_change
      FROM priced_group_days
      CROSS JOIN latest_price_update
    ),
    top_ranked_groups AS (
      SELECT priced_groups.*,
        row_number() OVER (PARTITION BY collection_id ORDER BY price DESC) AS group_rank
      FROM priced_groups
      WHERE price IS NOT NULL
    ),
    top_rows AS (
      SELECT collection_id, scan_id
      FROM (
        SELECT top_group.collection_id, cc.guid::text AS scan_id,
          row_number() OVER (PARTITION BY top_group.collection_id ORDER BY top_group.price DESC) AS top_rank
        FROM top_ranked_groups top_group
        ${inventoryRowsOfGroupJoinSql("top_group")}
        WHERE top_group.group_rank <= ${WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION}
      ) ranked
      WHERE ranked.top_rank <= ${WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION}
    ),
    ${pickedRowOfBestGroupSql("rise_rows", "max", sql`price_change > 0`, day)},
    ${pickedRowOfBestGroupSql("drop_rows", "min", sql`price_change < 0`, day)},
    shuffle_candidates AS (
      SELECT live.id AS collection_id, picked.scan_id, picked.daily_shuffle
      FROM live
      CROSS JOIN LATERAL (
        SELECT cc.guid::text AS scan_id, md5(cc.guid::text || ${day}) AS daily_shuffle
        FROM collection_cards cc
        WHERE cc.collection_id = live.id
          AND cc.guid IS NOT NULL
          AND ${inventoryCardSql(sql`cc.intake_lot_id`)}
        ORDER BY daily_shuffle
        LIMIT ${WIDGET_SUMMARY_CARDS_OF_THE_DAY}
      ) picked
    ),
    picks AS (
      SELECT collection_id, scan_id, true AS is_top_card, false AS is_rise, false AS is_drop,
        false AS is_shuffle, 0::int AS day_rank
      FROM top_rows
      UNION ALL
      SELECT collection_id, scan_id, false, true, false, false, 0 FROM rise_rows
      UNION ALL
      SELECT collection_id, scan_id, false, false, true, false, 0 FROM drop_rows
      UNION ALL
      SELECT collection_id, scan_id, false, false, false, true,
        (row_number() OVER (PARTITION BY collection_id ORDER BY daily_shuffle))::int
      FROM shuffle_candidates
    ),
    review AS MATERIALIZED (
      SELECT cc.guid::text AS scan_id, cc.scanned_at
      FROM collection_cards cc
      JOIN live ON live.id = cc.collection_id
      WHERE cc.org_id = ${orgId}
        AND (cc.low_confidence_match OR cc.has_alternative_matches)
        AND NOT cc.is_corrected
        AND NOT cc.is_reviewed
    )
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'scanId', picks.scan_id,
          'collectionGuid', live.guid::text,
          'isTopCard', picks.is_top_card,
          'isBiggestPriceRise', picks.is_rise,
          'isBiggestPriceDrop', picks.is_drop,
          'isInDailyShuffle', picks.is_shuffle,
          'dayRank', picks.day_rank
        )), '[]'::json)
        FROM picks
        JOIN live ON live.id = picks.collection_id
      ) AS collection_picks,
      (
        SELECT scan_id FROM rise_rows
        ORDER BY price_change DESC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_rise_scan_id,
      (
        SELECT scan_id FROM drop_rows
        ORDER BY price_change ASC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_drop_scan_id,
      (
        SELECT COALESCE(json_agg(shuffled.scan_id ORDER BY shuffled.daily_shuffle), '[]'::json)
        FROM (
          SELECT scan_id, daily_shuffle FROM shuffle_candidates
          ORDER BY daily_shuffle
          LIMIT ${WIDGET_SUMMARY_CARDS_OF_THE_DAY}
        ) shuffled
      ) AS org_daily_shuffle_scan_ids,
      (SELECT to_char(day, 'YYYY-MM-DD') FROM latest_price_update) AS latest_price_update_day,
      (SELECT count(*)::int FROM review) AS needs_review_count,
      (
        SELECT COALESCE(json_agg(recent_review.scan_id ORDER BY recent_review.scanned_at DESC), '[]'::json)
        FROM (
          SELECT scan_id, scanned_at FROM review
          WHERE scan_id IS NOT NULL
          ORDER BY scanned_at DESC
          LIMIT ${WIDGET_SUMMARY_REVIEW_CARDS_LIMIT}
        ) recent_review
      ) AS review_scan_ids
  `);
  return result.rows[0] as unknown as OrgWidgetPicksRow;
}

function loadSnapshotPricing(jwtClaims: string, orgId: string): Promise<OrgPricing> {
  return authQuery(jwtClaims, (tx) => loadOrgPricing(tx, orgId));
}

function orgCardValueSummaryInput(jwtClaims: string, orgId: string, pricing: OrgPricing, day: string) {
  return {
    orgId,
    variant: ORG_CARD_VALUE_SUMMARY_VARIANT,
    pricingKey: JSON.stringify(pricing),
    day,
    servesStaleWithoutWaiting: true,
    compute: (): Promise<OrgCardValueSummary> =>
      authQuery(jwtClaims, async (tx) => ({
        ...(await loadOrgCardValueSummaryRow(tx, orgId, pricing)),
        pricing,
        day,
      })),
    pendingPayload: async (previous: OrgCardValueSummary | null): Promise<OrgCardValueSummary> => ({
      ...(previous
        ? {
            collection_values: previous.collection_values.map((row) => ({ ...row, value: null })),
            top_card_scan_ids: [],
          }
        : await authQuery(jwtClaims, (tx) => loadOrgCardValueSummaryWithoutValues(tx, orgId))),
      pricing,
      day,
      is_value_pending: true,
    }),
  };
}

function orgWidgetPicksInput(jwtClaims: string, orgId: string, pricing: OrgPricing, day: string) {
  return {
    orgId,
    variant: ORG_WIDGET_PICKS_VARIANT,
    pricingKey: JSON.stringify(pricing),
    day,
    servesStaleWithoutWaiting: true,
    compute: (): Promise<OrgWidgetPicks> =>
      authQuery(jwtClaims, async (tx) => ({
        ...(await loadOrgWidgetPicksRow(tx, orgId, pricing, day)),
        pricing,
        day,
      })),
    pendingPayload: async (previous: OrgWidgetPicks | null): Promise<OrgWidgetPicks> => ({
      collection_picks: [],
      org_biggest_price_rise_scan_id: null,
      org_biggest_price_drop_scan_id: null,
      org_daily_shuffle_scan_ids: [],
      needs_review_count: previous?.needs_review_count ?? 0,
      review_scan_ids: previous?.review_scan_ids ?? [],
      pricing,
      day,
      is_value_pending: true,
    }),
  };
}

export async function loadStoredOrgCardValueSummary(
  jwtClaims: string,
  orgId: string,
): Promise<StoredSnapshotRead<OrgCardValueSummary>> {
  const pricing = await loadSnapshotPricing(jwtClaims, orgId);
  return readStoredOrgCardStats(orgCardValueSummaryInput(jwtClaims, orgId, pricing, utcDayKey()));
}

export async function loadStoredOrgWidgetPicks(
  jwtClaims: string,
  orgId: string,
): Promise<StoredSnapshotRead<OrgWidgetPicks>> {
  const pricing = await loadSnapshotPricing(jwtClaims, orgId);
  return readStoredOrgCardStats(orgWidgetPicksInput(jwtClaims, orgId, pricing, utcDayKey()));
}

export async function refreshOrgCardSnapshotsForPricing(
  jwtClaims: string,
  orgId: string,
  pricing: OrgPricing,
): Promise<void> {
  const day = utcDayKey();
  await refreshStoredOrgCardStats(orgCardValueSummaryInput(jwtClaims, orgId, pricing, day));
  await refreshStoredOrgCardStats(orgWidgetPicksInput(jwtClaims, orgId, pricing, day));
}
