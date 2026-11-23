import {
  COLLECTION_CARDS_INCLUDE_UNMATCHED_PARAM,
  COLLECTION_CARDS_PAGE_SIZE,
  COLLECTION_CARDS_RAW_CARD_DATA_MAIN_ONLY,
  COLLECTION_CARDS_RAW_CARD_DATA_NONE,
  COLLECTION_CARDS_RAW_CARD_DATA_PARAM,
  pageSizeFromQuery,
  type CollectionCardsCount,
  type CollectionCardsPage,
  type CollectionCardsQuery,
  type CollectionCardsSummary,
  type ScanTimelineBuckets,
  isScanTimelineGrouping,
} from "@magic-vault/shared";
import type { Transaction } from "../../db";
import {
  loadInlineUnmatchedCards,
  showsInlineUnmatchedCards,
} from "./cards-inline-unmatched";
import { applyCardPricesToScans } from "../../lib/card-search/card-prices";
import {
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_SUMMARY_MINIMUM_MS_BETWEEN_LOADS,
  GROUPED_CARD_RANKING_CACHE_MAX_ENTRIES,
  GROUPED_CARD_RANKING_CACHE_TTL_MS,
} from "../../lib/constants/collection-read-caches";
import { groupedCardRankingPage } from "../../lib/grouped-card-ranking";
import { readStoredCardStats } from "../../lib/collection-card-stats";
import { createOrgReadCache } from "../../lib/org-read-cache";
import { loadOrgPricing } from "../../lib/price-source";
import { hydrateSavedScans, withoutRawCardData } from "../../lib/saved-cards";
import {
  cardFilterSql,
  cardQueryUsesCatalog,
  findCardsCollection,
  isUnfilteredCardsQuery,
  loadCardsCount,
  loadCardStats,
  loadGroupedCardRanking,
  loadGroupedCardsPageFromRanking,
  loadScanTimelineBuckets,
  loadUnhydratedCardsPage,
  parseCardsQuery,
  parsePage,
} from "./cards-query";
import type {
  CachedGroupedCardRanking,
  CardsCollection,
  CollectionCardsPageEntries,
  LoadedCardsPageEntries,
  TransactionRunner,
} from "../../lib/interfaces/collections";

const cardsSummaryCache = createOrgReadCache<CollectionCardsSummary | null>(
  "org.collectionCardsSummary",
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
  COLLECTION_CARDS_SUMMARY_MINIMUM_MS_BETWEEN_LOADS,
);

const cardsCountCache = createOrgReadCache<CollectionCardsCount | null>(
  "org.collectionCardsCount",
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
);

const scanTimelineBucketsCache = createOrgReadCache<ScanTimelineBuckets | null>(
  "org.scanTimelineBuckets",
  COLLECTION_CARDS_AGGREGATE_CACHE_TTL_MS,
  COLLECTION_CARDS_AGGREGATE_CACHE_MAX_ENTRIES,
);

const groupedCardRankingCache = createOrgReadCache<CachedGroupedCardRanking>(
  "org.groupedCardRanking",
  GROUPED_CARD_RANKING_CACHE_TTL_MS,
  GROUPED_CARD_RANKING_CACHE_MAX_ENTRIES,
);

function cardFilterCacheKey(
  collectionGuid: string,
  { search, filters, unreviewed }: CollectionCardsQuery,
  ...extraKeyParts: string[]
): string {
  return JSON.stringify([collectionGuid, search, filters, unreviewed, ...extraKeyParts]);
}

function toLoadedCardsPageEntries(
  collection: CardsCollection,
  data: CollectionCardsPageEntries,
): LoadedCardsPageEntries {
  return { gameKey: collection.gameKey, lang: collection.lang, data };
}

async function loadUngroupedCardsPageEntries(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
  query: CollectionCardsQuery,
  page: number,
  pageSize: number,
): Promise<LoadedCardsPageEntries | null> {
  const count = await readCardsCount(run, guid, orgId, params);
  if (!count) return null;
  const loaded = await run(async (tx: Transaction) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    return toLoadedCardsPageEntries(
      collection,
      await loadUnhydratedCardsPage(tx, collection, query, page, pageSize, {
        ungroupedTotalsAreLoadedSeparately: true,
      }),
    );
  });
  if (!loaded || !count) return null;
  return {
    ...loaded,
    data: {
      ...loaded.data,
      totalEntries: count.totalCount,
      totalCards: count.totalCount,
    },
  };
}

async function loadGroupedCardsPageEntries(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  query: CollectionCardsQuery,
  page: number,
  pageSize: number,
): Promise<LoadedCardsPageEntries | null> {
  const cachedRanking =
    page === 0
      ? null
      : await groupedCardRankingCache.get(
          orgId,
          cardFilterCacheKey(guid, query, query.sort ?? ""),
          () =>
            run(async (tx) => {
              const collection = await findCardsCollection(tx, guid, orgId);
              return collection
                ? loadGroupedCardRanking(tx, collection, query)
                : { isTooLargeToCache: true as const };
            }),
        );
  return run(async (tx: Transaction) => {
    const collection = await findCardsCollection(tx, guid, orgId);
    if (!collection) return null;
    return toLoadedCardsPageEntries(
      collection,
      cachedRanking && !cachedRanking.isTooLargeToCache
        ? await loadGroupedCardsPageFromRanking(
            tx,
            collection,
            groupedCardRankingPage(cachedRanking.ranking, page, pageSize),
          )
        : await loadUnhydratedCardsPage(tx, collection, query, page, pageSize),
    );
  });
}

export async function readCardsPage(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsPage | null> {
  const query = parseCardsQuery(params);
  const page = parsePage(params.page);
  const pageSize = pageSizeFromQuery(params.limit, COLLECTION_CARDS_PAGE_SIZE);
  const result = query.grouped
    ? await loadGroupedCardsPageEntries(run, guid, orgId, query, page, pageSize)
    : await loadUngroupedCardsPageEntries(run, guid, orgId, params, query, page, pageSize);
  if (!result) return null;
  const hydratedItems = await hydrateSavedScans(
    { gameKey: result.gameKey, lang: result.lang },
    result.data.items,
    {
      includeRaw: true,
      includeRawOnAlternativeMatches:
        params[COLLECTION_CARDS_RAW_CARD_DATA_PARAM] !==
        COLLECTION_CARDS_RAW_CARD_DATA_MAIN_ONLY,
    },
  );
  const pricedItems = await applyCardPricesToScans(
    result.gameKey,
    result.lang,
    hydratedItems,
  );
  const items =
    params[COLLECTION_CARDS_RAW_CARD_DATA_PARAM] ===
    COLLECTION_CARDS_RAW_CARD_DATA_NONE
      ? withoutRawCardData(pricedItems)
      : pricedItems;
  const unmatched =
    params[COLLECTION_CARDS_INCLUDE_UNMATCHED_PARAM] === "1" &&
    showsInlineUnmatchedCards(query)
      ? await run(async (tx: Transaction) => {
          const collection = await findCardsCollection(tx, guid, orgId);
          return collection
            ? loadInlineUnmatchedCards(tx, collection, query, {
                firstScanId: items[0]?.scanId,
                lastScanId: items.at(-1)?.scanId,
                isFirstPage: page === 0,
                isLastPage: (page + 1) * pageSize >= result.data.totalEntries,
              })
            : undefined;
        })
      : undefined;
  return {
    ...result.data,
    items,
    page,
    pageSize,
    ...(unmatched ? { unmatched } : {}),
  };
}

export async function readCardsSummary(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsSummary | null> {
  const query = parseCardsQuery(params);
  if (isUnfilteredCardsQuery(query)) {
    const collection = await run((tx) => findCardsCollection(tx, guid, orgId));
    if (!collection) return null;
    const { payload: stats, isRefreshing } = await readStoredCardStats(
      collection,
      collection.pricing,
    );
    return {
      all: stats,
      filtered: stats,
      ...(isRefreshing ? { isRefreshing: true } : {}),
    };
  }
  return cardsSummaryCache.get(orgId, cardFilterCacheKey(guid, query), () =>
    run(async (tx) => {
      const collection = await findCardsCollection(tx, guid, orgId);
      if (!collection) return null;
      const pricing = await loadOrgPricing(tx, orgId);
      return loadCardStats(tx, collection, cardFilterSql(query, undefined, pricing), pricing);
    }),
  );
}

export async function readCardsCount(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<CollectionCardsCount | null> {
  const query = parseCardsQuery(params);
  return cardsCountCache.get(orgId, cardFilterCacheKey(guid, query), () =>
    run(async (tx) => {
      const collection = await findCardsCollection(tx, guid, orgId);
      if (!collection) return null;
      return {
        totalCount: await loadCardsCount(
          tx,
          collection,
          cardFilterSql(query, undefined, collection.pricing),
          cardQueryUsesCatalog(query, collection),
        ),
      };
    }),
  );
}

function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export async function readScanTimelineBuckets(
  run: TransactionRunner,
  guid: string,
  orgId: string,
  params: Record<string, string>,
): Promise<ScanTimelineBuckets | "invalid_params" | null> {
  const { grouping, timeZone } = params;
  if (!isScanTimelineGrouping(grouping) || !timeZone || !isKnownTimeZone(timeZone)) {
    return "invalid_params";
  }
  const query = parseCardsQuery(params);
  return scanTimelineBucketsCache.get(
    orgId,
    cardFilterCacheKey(guid, query, grouping, timeZone),
    () =>
      run(async (tx) => {
        const collection = await findCardsCollection(tx, guid, orgId);
        if (!collection) return null;
        return {
          buckets: await loadScanTimelineBuckets(
            tx,
            collection,
            cardFilterSql(query, undefined, collection.pricing),
            cardQueryUsesCatalog(query, collection),
            grouping,
            timeZone,
          ),
        };
      }),
  );
}
