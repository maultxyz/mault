import {
  WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  WIDGET_SUMMARY_COLLECTION_LIMIT,
  WIDGET_SUMMARY_DEVICE_ALERT_MAX_AGE_MINUTES,
  WIDGET_SUMMARY_REVIEW_CARDS_LIMIT,
  WIDGET_SUMMARY_SCAN_RATE_WINDOW_MINUTES,
  WIDGET_SUMMARY_SCAN_SESSION_GAP_MINUTES,
  WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION,
  PRICE_SOURCE_FIELDS,
  type DeviceAlertType,
  type OrgOverviewCard,
  type OrgPricing,
  type WidgetCollectionSummary,
  type WidgetSummary,
  type WidgetValueTrend,
} from "@magic-vault/shared";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { authQuery, type Transaction } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  deviceAlerts,
  games,
  orgDailyScanUsage,
} from "../db/schema";
import {
  collectionCardPriceRiseSql,
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import {
  loadCollectionValueHistories,
  loadOrgValueHistory,
  loadPreviousCollectionValues,
} from "./collection-value-snapshots";
import {
  HOME_READ_CACHE_MAX_ENTRIES,
  WIDGET_SUMMARY_CACHE_TTL_MS,
} from "./constants/home-read-caches";
import { ONE_MINUTE_MS } from "./constants/timing";
import type {
  CollectionValueRow,
  LoadedWidgetSummary,
  PreviousCollectionValues,
  WidgetCardPicksRow,
  WidgetCollectionCardPick,
  WidgetScanActivityRow,
} from "./interfaces/widget-summary";
import { loadOrgOverviewCards } from "./org-overview";
import { createOrgReadCache } from "./org-read-cache";
import { loadOrgPricing } from "./price-source";

const widgetSummaryCache = createOrgReadCache<LoadedWidgetSummary>(
  WIDGET_SUMMARY_CACHE_TTL_MS,
  HOME_READ_CACHE_MAX_ENTRIES,
);

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function pickCardsOfTheDay<Candidate>(
  biggestPriceRise: Candidate | undefined,
  biggestPriceDrop: Candidate | undefined,
  dailyShuffle: Candidate[],
  isSameCard: (first: Candidate, second: Candidate) => boolean,
): Candidate[] {
  const picks: Candidate[] = [];
  for (const candidate of [biggestPriceRise, biggestPriceDrop, ...dailyShuffle]) {
    if (picks.length >= WIDGET_SUMMARY_CARDS_OF_THE_DAY) break;
    if (candidate && !picks.some((pick) => isSameCard(pick, candidate))) picks.push(candidate);
  }
  return picks;
}

export function collectionCardOfTheDayScanIds(
  picks: WidgetCollectionCardPick[],
  collectionGuids: string[],
): string[] {
  return collectionGuids.flatMap((collectionGuid) => {
    const collectionPicks = picks.filter((pick) => pick.collectionGuid === collectionGuid);
    return pickCardsOfTheDay(
      collectionPicks.find((pick) => pick.isBiggestPriceRise),
      collectionPicks.find((pick) => pick.isBiggestPriceDrop),
      collectionPicks
        .filter((pick) => pick.isInDailyShuffle)
        .sort((first, second) => Number(first.dayRank) - Number(second.dayRank)),
      (first, second) => first.scanId === second.scanId,
    ).map((pick) => pick.scanId);
  });
}

async function loadWidgetCardPicks(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  day: string,
  includeCollectionSummaries: boolean,
): Promise<WidgetCardPicksRow> {
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
        ) AS needs_review
      FROM ${collectionCards}
      JOIN ${collections} ON ${collections.id} = ${collectionCards.collectionId}
      LEFT JOIN ${games} ON ${games.id} = ${collections.gameId}
      LEFT JOIN ${cardPrices} ON ${collectionCardPricesJoinOn()}
      WHERE ${collectionCards.orgId} = ${orgId}
        AND ${collections.orgId} = ${orgId}
        AND ${collections.isDeleted} = false
    )${includeCollectionSummaries ? sql`,
    ranked AS (
      SELECT scan_id, collection_id, price, price_change,
        row_number() OVER (PARTITION BY collection_id ORDER BY price DESC NULLS LAST) AS top_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY price_change DESC NULLS LAST, daily_shuffle) AS rise_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY price_change ASC NULLS LAST, daily_shuffle) AS drop_rank,
        row_number() OVER (PARTITION BY collection_id ORDER BY daily_shuffle) AS day_rank
      FROM base
      WHERE scan_id IS NOT NULL
    )` : sql``}
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'guid', live.guid::text,
          'name', live.name,
          'cardCount', COALESCE(totals.card_count, 0),
          'totalValue', COALESCE(totals.total_value, 0)
        )), '[]'::json)
        FROM collections live
        LEFT JOIN (
          SELECT collection_id, count(*)::int AS card_count, sum(price)::float8 AS total_value
          FROM base
          GROUP BY collection_id
        ) totals ON totals.collection_id = live.id
        WHERE live.org_id = ${orgId} AND live.is_deleted = false AND live.guid IS NOT NULL
      ) AS collection_values,
      ${includeCollectionSummaries ? sql`(
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
      )` : sql`'[]'::json`} AS collection_picks,
      (
        SELECT scan_id FROM base
        WHERE price_change > 0 AND scan_id IS NOT NULL
        ORDER BY price_change DESC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_rise_scan_id,
      (
        SELECT scan_id FROM base
        WHERE price_change < 0 AND scan_id IS NOT NULL
        ORDER BY price_change ASC, daily_shuffle
        LIMIT 1
      ) AS org_biggest_price_drop_scan_id,
      (
        SELECT COALESCE(json_agg(shuffled.scan_id ORDER BY shuffled.daily_shuffle), '[]'::json)
        FROM (
          SELECT scan_id, daily_shuffle FROM base
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
  return result.rows[0] as unknown as WidgetCardPicksRow;
}

async function loadCardsByScanId(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  scanIds: string[],
): Promise<OrgOverviewCard[]> {
  if (scanIds.length === 0) return [];
  return loadOrgOverviewCards(tx, orgId, pricing, {
    where: inArray(collectionCards.guid, scanIds),
    orderBy: desc(collectionCardPriceSql(pricing)),
    limit: scanIds.length,
  });
}

function valueTrend(
  current: { cardCount: number; totalValue: number },
  previous: PreviousCollectionValues | null,
  previousOfScope: { cardCount: number; totalValue: number } | undefined,
): WidgetValueTrend {
  return {
    cardCount: current.cardCount,
    totalValue: current.totalValue,
    previousCardCount: previous ? (previousOfScope?.cardCount ?? 0) : null,
    previousValue: previous ? (previousOfScope?.totalValue ?? 0) : null,
    previousDay: previous?.day ?? null,
  };
}

function sumValues(rows: Iterable<{ cardCount: number; totalValue: number }>) {
  let cardCount = 0;
  let totalValue = 0;
  for (const row of rows) {
    cardCount += row.cardCount;
    totalValue += row.totalValue;
  }
  return { cardCount, totalValue };
}

async function loadScanActivity(tx: Transaction, orgId: string): Promise<WidgetSummary["scanActivity"]> {
  const now = Date.now();
  const sessionGapMs = WIDGET_SUMMARY_SCAN_SESSION_GAP_MINUTES * ONE_MINUTE_MS;
  const lookbackIso = new Date(now - 24 * 60 * ONE_MINUTE_MS).toISOString();
  const activeSinceIso = new Date(now - sessionGapMs).toISOString();
  const rateWindowIso = new Date(now - WIDGET_SUMMARY_SCAN_RATE_WINDOW_MINUTES * ONE_MINUTE_MS).toISOString();
  const gapInterval = sql.raw(`'${WIDGET_SUMMARY_SCAN_SESSION_GAP_MINUTES} minutes'`);
  const result = await tx.execute(sql`
    WITH recent AS (
      SELECT cc.collection_id, cc.created_at,
        lag(cc.created_at) OVER (PARTITION BY cc.collection_id ORDER BY cc.created_at) AS previous_created_at
      FROM ${collectionCards} cc
      JOIN ${collections} col ON col.id = cc.collection_id
      WHERE cc.org_id = ${orgId}
        AND col.is_deleted = false
        AND cc.created_at >= ${lookbackIso}::timestamp
    ),
    sessions AS (
      SELECT collection_id,
        max(created_at) FILTER (
          WHERE previous_created_at IS NULL OR created_at - previous_created_at > interval ${gapInterval}
        ) AS session_started_at,
        max(created_at) AS last_scan_at,
        count(*) FILTER (WHERE created_at >= ${rateWindowIso}::timestamp)::int AS window_scan_count
      FROM recent
      GROUP BY collection_id
    )
    SELECT col.guid::text AS collection_guid,
      to_char(s.session_started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS session_started_at,
      to_char(s.last_scan_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_scan_at,
      (SELECT count(*) FROM recent r WHERE r.collection_id = s.collection_id AND r.created_at >= s.session_started_at)::int AS session_scan_count,
      s.window_scan_count
    FROM sessions s
    JOIN ${collections} col ON col.id = s.collection_id
    WHERE s.last_scan_at >= ${activeSinceIso}::timestamp
  `);
  return (result.rows as unknown as WidgetScanActivityRow[]).map((row) => ({
    collectionGuid: row.collection_guid,
    sessionScanCount: Number(row.session_scan_count),
    sessionStartedAt: row.session_started_at,
    lastScanAt: row.last_scan_at,
    scansPerMinute: Number(row.window_scan_count) / WIDGET_SUMMARY_SCAN_RATE_WINDOW_MINUTES,
  }));
}

async function loadLatestDeviceAlert(tx: Transaction, orgId: string): Promise<WidgetSummary["latestDeviceAlert"]> {
  const since = new Date(Date.now() - WIDGET_SUMMARY_DEVICE_ALERT_MAX_AGE_MINUTES * ONE_MINUTE_MS);
  const [alert] = await tx
    .select({ type: deviceAlerts.type, title: deviceAlerts.title, createdAt: deviceAlerts.createdAt })
    .from(deviceAlerts)
    .where(and(eq(deviceAlerts.orgId, orgId), gte(deviceAlerts.createdAt, since)))
    .orderBy(desc(deviceAlerts.createdAt))
    .limit(1);
  return alert
    ? { type: alert.type as DeviceAlertType, title: alert.title, createdAt: alert.createdAt.toISOString() }
    : null;
}

async function loadScansAllTime(tx: Transaction, orgId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number | null>`sum(${orgDailyScanUsage.scanCount})` })
    .from(orgDailyScanUsage)
    .where(eq(orgDailyScanUsage.orgId, orgId));
  return Number(row?.total ?? 0);
}

export async function loadWidgetSummary(
  tx: Transaction,
  orgId: string,
  { includeCollectionSummaries }: { includeCollectionSummaries: boolean },
): Promise<LoadedWidgetSummary> {
  const day = utcDay();
  const pricing = await loadOrgPricing(tx, orgId);
  const currency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const picks = await loadWidgetCardPicks(tx, orgId, pricing, day, includeCollectionSummaries);
  const collectionValues: CollectionValueRow[] = picks.collection_values.map((row) => ({
    guid: row.guid,
    name: row.name,
    cardCount: Number(row.cardCount),
    totalValue: Number(row.totalValue),
  }));
  const previous = await loadPreviousCollectionValues(tx, orgId, currency);
  const listedCollections = includeCollectionSummaries
    ? [...collectionValues]
        .sort((first, second) => second.totalValue - first.totalValue || first.name.localeCompare(second.name))
        .slice(0, WIDGET_SUMMARY_COLLECTION_LIMIT)
    : [];
  const listedCollectionGuids = listedCollections.map((collection) => collection.guid);
  const listedCollectionGuidSet = new Set(listedCollectionGuids);
  const listedPicks = picks.collection_picks.filter((pick) => listedCollectionGuidSet.has(pick.collectionGuid));
  const topScanIds = new Set(listedPicks.filter((pick) => pick.isTopCard).map((pick) => pick.scanId));
  const collectionCardOfTheDayOrder = collectionCardOfTheDayScanIds(listedPicks, listedCollectionGuids);
  const collectionCardOfTheDaySet = new Set(collectionCardOfTheDayOrder);
  const orgPickScanIds = [
    picks.org_biggest_price_rise_scan_id,
    picks.org_biggest_price_drop_scan_id,
    ...picks.org_daily_shuffle_scan_ids,
  ].filter((scanId): scanId is string => scanId !== null);
  const cards = await loadCardsByScanId(tx, orgId, pricing, [
    ...new Set([...topScanIds, ...collectionCardOfTheDayOrder, ...orgPickScanIds, ...picks.review_scan_ids]),
  ]);
  const cardsByScanId = new Map(cards.map((card) => [card.scanId, card]));
  const cardOf = (scanId: string | null) => (scanId ? cardsByScanId.get(scanId) : undefined);
  const topCards = cards.filter((card) => topScanIds.has(card.scanId));
  const cardsOfTheDay = cards
    .filter((card) => collectionCardOfTheDaySet.has(card.scanId))
    .sort(
      (first, second) =>
        collectionCardOfTheDayOrder.indexOf(first.scanId) - collectionCardOfTheDayOrder.indexOf(second.scanId),
    );
  const orgCardsOfTheDay = pickCardsOfTheDay(
    cardOf(picks.org_biggest_price_rise_scan_id),
    cardOf(picks.org_biggest_price_drop_scan_id),
    picks.org_daily_shuffle_scan_ids.flatMap((scanId) => cardOf(scanId) ?? []),
    (first, second) => first.scanId === second.scanId,
  );
  const reviewCards = picks.review_scan_ids.flatMap((scanId) => cardOf(scanId) ?? []);
  const valueHistories = await loadCollectionValueHistories(tx, orgId, currency, listedCollectionGuids);
  const collectionsSummary: WidgetCollectionSummary[] = listedCollections.map((collection) => ({
    guid: collection.guid,
    name: collection.name,
    ...valueTrend(collection, previous, previous?.byCollectionGuid.get(collection.guid)),
    topCards: topCards.filter((card) => card.collectionGuid === collection.guid),
    cardsOfTheDay: cardsOfTheDay.filter((card) => card.collectionGuid === collection.guid),
    valueHistory: [...(valueHistories.get(collection.guid) ?? []), { day, totalValue: collection.totalValue }],
  }));
  const orgTotals = sumValues(collectionValues);
  const summary: WidgetSummary = {
    all: {
      ...valueTrend(
        orgTotals,
        previous,
        previous ? sumValues(previous.byCollectionGuid.values()) : undefined,
      ),
      cardsOfTheDay: orgCardsOfTheDay,
      valueHistory: [
        ...(await loadOrgValueHistory(tx, orgId, currency)),
        { day, totalValue: orgTotals.totalValue },
      ],
    },
    collections: collectionsSummary,
    review: { needsReviewCount: Number(picks.needs_review_count), cards: reviewCards },
    scanActivity: await loadScanActivity(tx, orgId),
    latestDeviceAlert: await loadLatestDeviceAlert(tx, orgId),
    scansAllTime: await loadScansAllTime(tx, orgId),
  };
  return { summary, currency, collectionValues };
}

export function loadCachedWidgetSummary(
  jwtClaims: string,
  orgId: string,
  { includeCollectionSummaries }: { includeCollectionSummaries: boolean },
): Promise<LoadedWidgetSummary> {
  const variantKey = `${utcDay()}:${includeCollectionSummaries ? "full" : "withoutCollectionSummaries"}`;
  return widgetSummaryCache.get(orgId, variantKey, () =>
    authQuery(jwtClaims, (tx) => loadWidgetSummary(tx, orgId, { includeCollectionSummaries })),
  );
}
