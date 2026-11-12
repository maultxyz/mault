import {
  WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  WIDGET_SUMMARY_COLLECTION_LIMIT,
  WIDGET_SUMMARY_DEVICE_ALERT_MAX_AGE_MINUTES,
  WIDGET_SUMMARY_REVIEW_CARDS_LIMIT,
  WIDGET_SUMMARY_SCAN_RATE_WINDOW_MINUTES,
  WIDGET_SUMMARY_SCAN_SESSION_GAP_MINUTES,
  WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION,
  type DeviceAlertType,
  type OrgOverviewCard,
  type OrgPricing,
  type WidgetCollectionSummary,
  type WidgetSummary,
  type WidgetValueTrend,
} from "@magic-vault/shared";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  cardPrices,
  collectionCards,
  collections,
  deviceAlerts,
  games,
} from "../db/schema";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import { loadCollectionValues, loadPreviousCollectionValues } from "./collection-value-snapshots";
import { ONE_MINUTE_MS } from "./constants/timing";
import type {
  CollectionValueRow,
  PreviousCollectionValues,
  WidgetScanActivityRow,
} from "./interfaces/widget-summary";
import { loadOrgOverviewCards } from "./org-overview";

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyShuffleOrderSql(day: string) {
  return sql`md5(${collectionCards.guid}::text || ${day})`;
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

async function loadCollectionCards(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  collectionGuids: string[],
  day: string,
): Promise<{ topCards: OrgOverviewCard[]; cardsOfTheDay: OrgOverviewCard[] }> {
  if (collectionGuids.length === 0) return { topCards: [], cardsOfTheDay: [] };
  const cardPrice = collectionCardPriceSql(pricing);
  const ranked = tx
    .select({
      scanId: collectionCards.guid,
      hasPrice: sql<boolean>`${cardPrice} IS NOT NULL`.as("has_price"),
      topRank: sql<number>`row_number() OVER (PARTITION BY ${collectionCards.collectionId} ORDER BY ${cardPrice} DESC NULLS LAST)`.as("top_rank"),
      dayRank: sql<number>`row_number() OVER (PARTITION BY ${collectionCards.collectionId} ORDER BY ${dailyShuffleOrderSql(day)})`.as("day_rank"),
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        eq(collections.isDeleted, false),
        inArray(collections.guid, collectionGuids),
      ),
    )
    .as("ranked");
  const picks = await tx
    .select({
      scanId: ranked.scanId,
      isTopCard: sql<boolean>`${ranked.hasPrice} AND ${ranked.topRank} <= ${WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION}`,
      isCardOfTheDay: sql<boolean>`${ranked.dayRank} <= ${WIDGET_SUMMARY_CARDS_OF_THE_DAY}`,
    })
    .from(ranked)
    .where(
      sql`(${ranked.hasPrice} AND ${ranked.topRank} <= ${WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION}) OR ${ranked.dayRank} <= ${WIDGET_SUMMARY_CARDS_OF_THE_DAY}`,
    );
  const scanIds = picks.flatMap((pick) => (pick.scanId ? [pick.scanId] : []));
  if (scanIds.length === 0) return { topCards: [], cardsOfTheDay: [] };
  const cards = await loadOrgOverviewCards(tx, orgId, pricing, {
    where: inArray(collectionCards.guid, scanIds),
    orderBy: desc(cardPrice),
    limit: scanIds.length,
  });
  const topScanIds = new Set(picks.filter((pick) => pick.isTopCard).map((pick) => pick.scanId));
  const cardOfTheDayScanIds = new Set(picks.filter((pick) => pick.isCardOfTheDay).map((pick) => pick.scanId));
  return {
    topCards: cards.filter((card) => topScanIds.has(card.scanId)),
    cardsOfTheDay: cards.filter((card) => cardOfTheDayScanIds.has(card.scanId)),
  };
}

async function loadReview(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
): Promise<WidgetSummary["review"]> {
  const needsReview = and(
    sql`(${collectionCards.lowConfidenceMatch} OR ${collectionCards.hasAlternativeMatches})`,
    eq(collectionCards.isCorrected, false),
    eq(collectionCards.isReviewed, false),
  );
  const [totals] = await tx
    .select({ needsReviewCount: count(collectionCards.id) })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(and(eq(collectionCards.orgId, orgId), eq(collections.isDeleted, false), needsReview));
  const needsReviewCount = Number(totals?.needsReviewCount ?? 0);
  if (needsReviewCount === 0) return { needsReviewCount, cards: [] };
  const cards = await loadOrgOverviewCards(tx, orgId, pricing, {
    where: needsReview,
    orderBy: desc(collectionCards.scannedAt),
    limit: WIDGET_SUMMARY_REVIEW_CARDS_LIMIT,
  });
  return { needsReviewCount, cards };
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
        max(created_at) AS last_scan_at
      FROM recent
      GROUP BY collection_id
    )
    SELECT col.guid::text AS collection_guid,
      to_char(s.session_started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS session_started_at,
      to_char(s.last_scan_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS last_scan_at,
      (SELECT count(*) FROM recent r WHERE r.collection_id = s.collection_id AND r.created_at >= s.session_started_at)::int AS session_scan_count,
      (SELECT count(*) FROM recent r WHERE r.collection_id = s.collection_id AND r.created_at >= ${rateWindowIso}::timestamp)::int AS window_scan_count
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

export async function loadWidgetSummary(
  tx: Transaction,
  orgId: string,
): Promise<{ summary: WidgetSummary; currency: string; collectionValues: CollectionValueRow[] }> {
  const day = utcDay();
  const { pricing, currency, rows: collectionValues } = await loadCollectionValues(tx, orgId);
  const previous = await loadPreviousCollectionValues(tx, orgId, currency);
  const listedCollections = [...collectionValues]
    .sort((first, second) => second.totalValue - first.totalValue || first.name.localeCompare(second.name))
    .slice(0, WIDGET_SUMMARY_COLLECTION_LIMIT);
  const { topCards, cardsOfTheDay } = await loadCollectionCards(
    tx,
    orgId,
    pricing,
    listedCollections.map((collection) => collection.guid),
    day,
  );
  const orgCardsOfTheDay = await loadOrgOverviewCards(tx, orgId, pricing, {
    orderBy: dailyShuffleOrderSql(day),
    limit: WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  });
  const collectionsSummary: WidgetCollectionSummary[] = listedCollections.map((collection) => ({
    guid: collection.guid,
    name: collection.name,
    ...valueTrend(collection, previous, previous?.byCollectionGuid.get(collection.guid)),
    topCards: topCards.filter((card) => card.collectionGuid === collection.guid),
    cardsOfTheDay: cardsOfTheDay.filter((card) => card.collectionGuid === collection.guid),
  }));
  const summary: WidgetSummary = {
    all: {
      ...valueTrend(
        sumValues(collectionValues),
        previous,
        previous ? sumValues(previous.byCollectionGuid.values()) : undefined,
      ),
      cardsOfTheDay: orgCardsOfTheDay,
    },
    collections: collectionsSummary,
    review: await loadReview(tx, orgId, pricing),
    scanActivity: await loadScanActivity(tx, orgId),
    latestDeviceAlert: await loadLatestDeviceAlert(tx, orgId),
  };
  return { summary, currency, collectionValues };
}
