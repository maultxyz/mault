import {
  ORG_OVERVIEW_ACTIVITY_DAYS,
  ORG_OVERVIEW_RECENT_CARDS_LIMIT,
  ORG_OVERVIEW_TOP_CARDS_LIMIT,
  ORG_OVERVIEW_WEEK_DAYS,
  type OrgOverview,
  type OrgOverviewCard,
  type OrgOverviewDay,
  type PlayingCard,
} from "@magic-vault/shared";
import {
  and,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Transaction } from "../db";
import { cardPrices, collectionCards, collections, games } from "../db/schema";
import {
  collectionCardPriceSql,
  collectionCardPricesJoinOn,
} from "./card-price-sql";
import { ONE_DAY_MS } from "./constants/timing";
import { loadOrgPricing } from "./price-source";
import { hydrateSavedCards } from "./saved-cards";

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

  const valueRows = await tx
    .select({
      guid: collections.guid,
      cardCount: count(collectionCards.id),
      value: sql<number | null>`sum(${cardPrice})`,
    })
    .from(collections)
    .leftJoin(collectionCards, eq(collectionCards.collectionId, collections.id))
    .leftJoin(games, eq(games.id, collections.gameId))
    .leftJoin(cardPrices, collectionCardPricesJoinOn())
    .where(liveCollections)
    .groupBy(collections.id, collections.guid);
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

  const loadCards = async (
    orderBy: SQL | ReturnType<typeof desc>,
    limit: number,
    onlyPriced: boolean,
  ): Promise<OrgOverviewCard[]> => {
    const rows = await tx
      .select({
        scanId: collectionCards.guid,
        collectionGuid: collections.guid,
        collectionName: collections.name,
        card: sql<PlayingCard>`${collectionCards.card} - 'raw'`,
        isFoil: collectionCards.isFoil,
        scannedAt: collectionCards.scannedAt,
        price: cardPrice,
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
          liveCollections,
          onlyPriced ? isNotNull(cardPrice) : undefined,
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
      scannedAt: row.scannedAt.toISOString(),
    }));
  };

  const topCards = await loadCards(
    desc(cardPrice),
    ORG_OVERVIEW_TOP_CARDS_LIMIT,
    true,
  );
  const recentCards = await loadCards(
    desc(collectionCards.createdAt),
    ORG_OVERVIEW_RECENT_CARDS_LIMIT,
    false,
  );

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
