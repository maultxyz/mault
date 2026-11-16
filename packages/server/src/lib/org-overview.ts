import {
  ORG_OVERVIEW_ACTIVITY_DAYS,
  ORG_OVERVIEW_RECENT_CARDS_LIMIT,
  ORG_OVERVIEW_TOP_CARDS_LIMIT,
  ORG_OVERVIEW_WEEK_DAYS,
  type OrgOverview,
  type OrgOverviewCard,
  type OrgOverviewDay,
  type OrgPricing,
  type PlayingCard,
} from "@magic-vault/shared";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  sql,
} from "drizzle-orm";
import { authQuery, type Transaction } from "../db";
import { cardPrices, collectionCards, collections, games } from "../db/schema";
import {
  collectionCardPriceRiseSql,
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import {
  HOME_READ_CACHE_MAX_ENTRIES,
  ORG_OVERVIEW_CACHE_TTL_MS,
} from "./constants/home-read-caches";
import { ONE_DAY_MS } from "./constants/timing";
import { inventoryCardSql } from "./inventory-sql";
import { createOrgReadCache } from "./org-read-cache";
import { loadOrgPricing } from "./price-source";
import type {
  OrgOverviewCardsQuery,
  OrgOverviewValuesRow,
} from "./interfaces/org-overview";
import { hydrateSavedCards } from "./saved-cards";

const orgOverviewCache = createOrgReadCache<OrgOverview>(
  ORG_OVERVIEW_CACHE_TTL_MS,
  HOME_READ_CACHE_MAX_ENTRIES,
);

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fillDays(rows: { day: string; count: number }[]): OrgOverviewDay[] {
  const counts = new Map(rows.map((row) => [row.day, Number(row.count)]));
  const today = Date.now();
  return Array.from({ length: ORG_OVERVIEW_ACTIVITY_DAYS }, (_, i) => {
    const date = utcDayKey(
      new Date(today - (ORG_OVERVIEW_ACTIVITY_DAYS - 1 - i) * ONE_DAY_MS),
    );
    return { date, count: counts.get(date) ?? 0 };
  });
}

export async function loadOrgOverviewCards(
  tx: Transaction,
  orgId: string,
  pricing: OrgPricing,
  { where, orderBy, limit }: OrgOverviewCardsQuery,
): Promise<OrgOverviewCard[]> {
  const cardPrice = collectionCardPriceSql(pricing);
  const rows = await tx
    .select({
      scanId: collectionCards.guid,
      collectionGuid: collections.guid,
      collectionName: collections.name,
      card: sql<PlayingCard>`${collectionCards.card} - 'raw'`,
      isFoil: collectionCards.isFoil,
      scannedAt: collectionCards.scannedAt,
      price: cardPrice,
      priceChangeSinceScan: collectionCardPriceRiseSql(pricing),
      collectionLang: collections.lang,
      gameKey: games.key,
    })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        eq(collections.orgId, orgId),
        eq(collections.isDeleted, false),
        where,
      ),
    )
    .orderBy(orderBy)
    .limit(limit);
  const cards = await hydrateSavedCards(
    rows.map((row) => ({ gameKey: row.gameKey, lang: row.collectionLang, card: row.card })),
    { includeRaw: false },
  );
  return rows.map((row, i) => ({
    scanId: row.scanId!,
    collectionGuid: row.collectionGuid!,
    collectionName: row.collectionName,
    card: cards[i],
    isFoil: row.isFoil,
    price: row.price == null ? null : Number(row.price),
    priceChangeSinceScan: row.priceChangeSinceScan == null ? null : Number(row.priceChangeSinceScan),
    scannedAt: row.scannedAt.toISOString(),
  }));
}

export async function loadOrgOverview(
  tx: Transaction,
  orgId: string,
): Promise<OrgOverview> {
  const pricing = await loadOrgPricing(tx, orgId);
  const cardPrice = collectionCardPriceSql(pricing);
  const liveCollections = and(
    eq(collections.orgId, orgId),
    eq(collections.isDeleted, false),
  );

  const valuesResult = await tx.execute(sql`
    WITH base AS MATERIALIZED (
      SELECT
        ${collectionCards.guid}::text AS scan_id,
        ${collectionCards.collectionId} AS collection_id,
        (${cardPrice})::float8 AS price
      FROM ${collectionCards}
      JOIN ${collections} ON ${collections.id} = ${collectionCards.collectionId}
      LEFT JOIN ${games} ON ${games.id} = ${collections.gameId}
      LEFT JOIN ${cardPrices} ON ${collectionCardPricesJoinOn()}
      WHERE ${collectionCards.orgId} = ${orgId}
        AND ${liveCollections}
        AND ${inventoryCardSql()}
    )
    SELECT
      (
        SELECT COALESCE(json_agg(json_build_object(
          'guid', live.guid::text,
          'cardCount', COALESCE(totals.card_count, 0),
          'value', totals.value
        )), '[]'::json)
        FROM collections live
        LEFT JOIN (
          SELECT collection_id, count(*)::int AS card_count, sum(price)::float8 AS value
          FROM base
          GROUP BY collection_id
        ) totals ON totals.collection_id = live.id
        WHERE live.org_id = ${orgId} AND live.is_deleted = false
      ) AS collection_values,
      (
        SELECT COALESCE(json_agg(top.scan_id ORDER BY top.price DESC), '[]'::json)
        FROM (
          SELECT scan_id, price FROM base
          WHERE price IS NOT NULL AND scan_id IS NOT NULL
          ORDER BY price DESC
          LIMIT ${ORG_OVERVIEW_TOP_CARDS_LIMIT}
        ) top
      ) AS top_card_scan_ids
  `);
  const { collection_values: valueRows, top_card_scan_ids: topCardScanIds } =
    valuesResult.rows[0] as unknown as OrgOverviewValuesRow;
  const cardCount = valueRows.reduce(
    (sum, row) => sum + Number(row.cardCount),
    0,
  );
  const totalValue = valueRows.reduce(
    (sum, row) => sum + (row.value == null ? 0 : Number(row.value)),
    0,
  );

  const since = new Date(
    Date.now() - (ORG_OVERVIEW_ACTIVITY_DAYS - 1) * ONE_DAY_MS,
  );
  since.setUTCHours(0, 0, 0, 0);
  const dayKey = sql<string>`to_char(date_trunc('day', ${collectionCards.createdAt}), 'YYYY-MM-DD')`;
  const dayRows = await tx
    .select({ day: dayKey, count: count(collectionCards.id) })
    .from(collectionCards)
    .innerJoin(collections, eq(collections.id, collectionCards.collectionId))
    .where(
      and(
        eq(collectionCards.orgId, orgId),
        liveCollections,
        gte(collectionCards.createdAt, since),
      ),
    )
    .groupBy(dayKey);

  const topCards =
    topCardScanIds.length > 0
      ? await loadOrgOverviewCards(tx, orgId, pricing, {
          where: inArray(collectionCards.guid, topCardScanIds),
          orderBy: desc(cardPrice),
          limit: topCardScanIds.length,
        })
      : [];
  const recentCards = await loadOrgOverviewCards(tx, orgId, pricing, {
    orderBy: desc(collectionCards.createdAt),
    limit: ORG_OVERVIEW_RECENT_CARDS_LIMIT,
  });

  const scansByDay = fillDays(dayRows);
  return {
    collectionCount: valueRows.length,
    cardCount,
    totalValue,
    scansToday: scansByDay[scansByDay.length - 1]?.count ?? 0,
    scansThisWeek: scansByDay
      .slice(-ORG_OVERVIEW_WEEK_DAYS)
      .reduce((sum, day) => sum + day.count, 0),
    scansByDay,
    collectionValues: Object.fromEntries(
      valueRows
        .filter((row) => row.guid && row.value != null)
        .map((row) => [row.guid!, Number(row.value)]),
    ),
    topCards,
    recentCards,
  };
}

export function loadCachedOrgOverview(
  jwtClaims: string,
  orgId: string,
): Promise<OrgOverview> {
  return orgOverviewCache.get(orgId, utcDayKey(new Date()), () =>
    authQuery(jwtClaims, (tx) => loadOrgOverview(tx, orgId)),
  );
}
