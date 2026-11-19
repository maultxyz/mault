import {
  WIDGET_SUMMARY_CARDS_OF_THE_DAY,
  WIDGET_SUMMARY_COLLECTION_LIMIT,
  WIDGET_SUMMARY_DEVICE_ALERT_MAX_AGE_MINUTES,
  WIDGET_SUMMARY_SCAN_RATE_WINDOW_MINUTES,
  WIDGET_SUMMARY_SCAN_SESSION_GAP_MINUTES,
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
  collectionCards,
  collections,
  deviceAlerts,
  orgDailyScanUsage,
} from "../db/schema";
import { collectionCardPriceSql } from "./card-price-sql";
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
  WidgetCollectionCardPick,
  WidgetScanActivityRow,
} from "./interfaces/widget-summary";
import type { OrgCardValueSummary } from "./interfaces/org-card-value-summary";
import { loadCachedOrgCardValueSummary, utcDayKey } from "./org-card-value-summary";
import { loadOrgOverviewCards } from "./org-overview";
import { createOrgReadCache } from "./org-read-cache";

const widgetSummaryCache = createOrgReadCache<LoadedWidgetSummary>(
  WIDGET_SUMMARY_CACHE_TTL_MS,
  HOME_READ_CACHE_MAX_ENTRIES,
);

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
  picks: OrgCardValueSummary,
  { includeCollectionSummaries }: { includeCollectionSummaries: boolean },
): Promise<LoadedWidgetSummary> {
  const { day, pricing } = picks;
  const currency = PRICE_SOURCE_FIELDS[pricing.source].currency;
  const collectionValues: CollectionValueRow[] = picks.collection_values.flatMap((row) =>
    row.guid == null
      ? []
      : [{
          guid: row.guid,
          name: row.name,
          cardCount: Number(row.cardCount),
          totalValue: row.value == null ? 0 : Number(row.value),
        }],
  );
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
  const variantKey = `${utcDayKey()}:${includeCollectionSummaries ? "full" : "withoutCollectionSummaries"}`;
  return widgetSummaryCache.get(orgId, variantKey, async () => {
    const picks = await loadCachedOrgCardValueSummary(jwtClaims, orgId);
    return authQuery(jwtClaims, (tx) => loadWidgetSummary(tx, orgId, picks, { includeCollectionSummaries }));
  });
}
