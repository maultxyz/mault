import {
  CARD_PRINTINGS_PAGE_SIZE,
  type CardPrintingsPage,
  type CardSearchPage,
  type CardSetOption,
  type CatalogCardSearchPage,
  type PlayingCard,
  type Result,
} from "@magic-vault/shared";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { STORED_SEARCH_LIMIT } from "../constants/card-search";
import {
  applyCardPrices,
  applyLoadedCardPrices,
  loadStoredCardPrices,
} from "./card-prices";
import {
  catalogCacheKey,
  createCatalogSearchCache,
  loadThroughStoredCardCache,
} from "./catalog-read-cache";
import { listCardSets } from "./card-sets";
import type {
  CardPrintingRow,
  GroupedCatalogSearchRow,
  PrintingQuery,
  ResolvedCardSearch,
} from "../interfaces/card-search";
import { validateCatalogQuery } from "./validate";
import { parsePrintingQueries } from "./printing-query";
import {
  cardPrintingsSql,
  catalogPrintingIsListedSql,
  groupedCatalogSearchSql,
} from "./catalog-printing-order";

async function loadStoredCards(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  ids: string[],
): Promise<Map<string, PlayingCard>> {
  if (ids.length === 0) return new Map();
  const priceScope = { gameKey, lang };
  const [rows, pricesOfRequestedIds] = await Promise.all([
    db
      .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
      .from(cardImageVectors)
      .where(
        and(
          eq(cardImageVectors.gameKey, gameKey),
          eq(cardImageVectors.lang, lang),
          inArray(cardImageVectors.cardId, ids),
          isNotNull(cardImageVectors.data),
        ),
      ),
    loadStoredCardPrices(priceScope, ids),
  ]);
  const cards = rows.flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.cardId, lang);
    return card ? [{ cardId: row.cardId, card }] : [];
  });
  const requestedIds = new Set(ids);
  const unrequestedPriceIds = cards
    .map(({ card }) => card.id)
    .filter((cardId) => !requestedIds.has(cardId));
  const storedPrices =
    unrequestedPriceIds.length === 0
      ? pricesOfRequestedIds
      : new Map([
          ...pricesOfRequestedIds,
          ...(await loadStoredCardPrices(priceScope, unrequestedPriceIds)),
        ]);
  const priced = await applyLoadedCardPrices(
    adapter,
    cards.map(({ card }) => card),
    storedPrices,
  );
  return new Map(cards.map(({ cardId }, i) => [cardId, priced[i]]));
}

function findStoredCards(
  resolved: ResolvedCardSearch,
  cardIds: string[],
): Promise<Map<string, PlayingCard>> {
  const ids = [...new Set(cardIds)];
  if (ids.length === 0) return Promise.resolve(new Map());
  return loadThroughStoredCardCache(
    (cardId) => catalogCacheKey([resolved.gameKey, resolved.lang, cardId]),
    ids,
    (missingIds) => loadStoredCards(resolved, missingIds),
  );
}

const cardSearchCache = createCatalogSearchCache<Result<CardSearchPage>>();
const cardSetSearchCache = createCatalogSearchCache<CardSetOption[]>();
const groupedCatalogSearchCache =
  createCatalogSearchCache<Result<CatalogCardSearchPage>>();
const cardPrintingsCache = createCatalogSearchCache<Result<CardPrintingsPage>>();

function resolvedSearchCacheKeyParts({
  gameKey,
  lang,
  searchAllLanguages,
  onlyLanguage,
}: ResolvedCardSearch): (string | boolean | undefined)[] {
  return [gameKey, lang, searchAllLanguages === true, onlyLanguage];
}

function storedLanguageMatch({
  lang,
  searchAllLanguages,
  onlyLanguage,
}: ResolvedCardSearch) {
  if (onlyLanguage) return eq(cardImageVectors.lang, onlyLanguage);
  return searchAllLanguages ? undefined : eq(cardImageVectors.lang, lang);
}

async function priceCardsByLanguage(
  adapter: ResolvedCardSearch["adapter"],
  gameKey: string,
  cards: PlayingCard[],
  fallbackLang: string,
): Promise<PlayingCard[]> {
  const indexesByLang = new Map<string, number[]>();
  cards.forEach((card, index) => {
    const lang = card.lang ?? fallbackLang;
    const existingEntries = indexesByLang.get(lang);
    if (existingEntries) existingEntries.push(index);
    else indexesByLang.set(lang, [index]);
  });
  const priced = [...cards];
  for (const [lang, indexes] of indexesByLang) {
    const pricedGroup = await applyCardPrices(
      adapter,
      { gameKey, lang },
      indexes.map((index) => cards[index]),
    );
    indexes.forEach((index, i) => {
      priced[index] = pricedGroup[i];
    });
  }
  return priced;
}

function numberMatches(number: string): SQL {
  const collectorNumber = sql`lower(${cardImageVectors.collectorNumber})`;
  const wanted = number.toLowerCase();
  return sql`(${collectorNumber} = ${wanted} OR ltrim(${collectorNumber}, '0') = ltrim(${wanted}, '0'))`;
}

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

function printingMatches({ setCode, number, name }: PrintingQuery): SQL {
  if (name) {
    return sql`(${ilike(cardImageVectors.name, likePattern(name))} AND ${numberMatches(number)})`;
  }
  if (!setCode) return numberMatches(number);
  const collectorNumber = sql`lower(${cardImageVectors.collectorNumber})`;
  const set = setCode.toLowerCase();
  const wanted = number.toLowerCase();
  return sql`(lower(${cardImageVectors.setCode}) = ${set} AND (${numberMatches(number)} OR ${collectorNumber} = ${`${set}-${wanted}`} OR ${collectorNumber} = ${`${set}${wanted}`}))`;
}

function storedSearchMatch(trimmed: string) {
  const pattern = likePattern(trimmed);
  const printingQueries = parsePrintingQueries(trimmed);
  const printingMatch = printingQueries.length
    ? or(...printingQueries.map(printingMatches))
    : undefined;
  const setMatch = printingQueries.some((q) => !q.setCode && !q.name)
    ? sql`lower(${cardImageVectors.setCode}) = ${trimmed.toLowerCase()}`
    : undefined;
  return {
    printingMatch,
    match: or(ilike(cardImageVectors.name, pattern), printingMatch, setMatch),
  };
}

async function searchStoredCards(
  resolved: ResolvedCardSearch,
  query: string,
  offset: number,
  setCode?: string,
): Promise<CardSearchPage> {
  const { adapter, gameKey, lang } = resolved;
  const trimmed = query.trim();
  const { match, printingMatch } = storedSearchMatch(trimmed);
  const rows = await db
    .select({
      cardId: cardImageVectors.cardId,
      lang: cardImageVectors.lang,
      data: cardImageVectors.data,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        storedLanguageMatch(resolved),
        match,
        setCode ? eq(cardImageVectors.setCode, setCode) : undefined,
        isNotNull(cardImageVectors.data),
      ),
    )
    .orderBy(
      ...(printingMatch ? [desc(sql`coalesce(${printingMatch}, false)`)] : []),
      desc(sql`lower(${cardImageVectors.name}) = lower(${trimmed})`),
      cardImageVectors.name,
      cardImageVectors.setCode,
      cardImageVectors.collectorNumber,
      desc(sql`${cardImageVectors.lang} = ${lang}`),
      cardImageVectors.lang,
      cardImageVectors.cardId,
    )
    .offset(offset)
    .limit(STORED_SEARCH_LIMIT + 1);
  const hasMore = rows.length > STORED_SEARCH_LIMIT;
  const cards = rows.slice(0, STORED_SEARCH_LIMIT).flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.cardId, row.lang);
    return card ? [{ ...card, lang: row.lang }] : [];
  });
  return {
    cards: await priceCardsByLanguage(adapter, gameKey, cards, lang),
    nextOffset: hasMore ? offset + STORED_SEARCH_LIMIT : null,
  };
}

export async function sampleStoredCard(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  index: number,
): Promise<PlayingCard | null> {
  const [row] = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        isNotNull(cardImageVectors.data),
      ),
    )
    .orderBy(sql`md5(${cardImageVectors.cardId})`)
    .offset(index)
    .limit(1);
  if (!row) return null;
  return adapter.normalizeStored(row.data, row.cardId, lang) ?? null;
}

export async function searchCardById(
  resolved: ResolvedCardSearch,
  id: string,
): Promise<Result<PlayingCard>> {
  const stored = (await findStoredCards(resolved, [id])).get(id);
  if (!stored) return { success: false, message: `Card ${id} not found.` };
  return {
    success: true,
    message: "Successfully fetched card by id.",
    data: stored,
  };
}

export async function searchCardsByIds(
  resolved: ResolvedCardSearch,
  ids: string[],
): Promise<Map<string, PlayingCard>> {
  return findStoredCards(resolved, ids);
}

async function searchCardsUncached(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
  setCode?: string,
): Promise<Result<CardSearchPage>> {
  const invalid = validateCatalogQuery(query);
  if (invalid) return invalid;

  const page = await searchStoredCards(resolved, query, offset, setCode);
  if (offset === 0 && page.cards.length === 0) {
    return {
      success: false,
      message: `No cards were found with the query: ${query}`,
    };
  }
  return {
    success: true,
    message: "Cards successfully retrieved.",
    data: page,
  };
}

async function searchCardSetsUncached(
  resolved: ResolvedCardSearch,
  query: string,
): Promise<CardSetOption[]> {
  if (validateCatalogQuery(query)) return [];
  const { match } = storedSearchMatch(query.trim());
  const rows = await db
    .select({
      code: cardImageVectors.setCode,
      cardCount: sql<number>`count(*)::int`,
    })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, resolved.gameKey),
        storedLanguageMatch(resolved),
        match,
        isNotNull(cardImageVectors.data),
      ),
    )
    .groupBy(cardImageVectors.setCode);
  if (rows.length === 0) return [];
  const names = new Map(
    (await listCardSets(resolved)).map((set) => [set.code, set.name]),
  );
  return rows
    .map(({ code, cardCount }) => ({
      code,
      name: names.get(code) ?? code.toUpperCase(),
      cardCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function searchCatalogCardsGroupedByNameUncached(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
  setCode?: string,
  pageLimit = STORED_SEARCH_LIMIT,
): Promise<Result<CatalogCardSearchPage>> {
  if (validateCatalogQuery(query)) {
    return {
      success: true,
      message: "Cards successfully retrieved.",
      data: { results: [], nextOffset: null },
    };
  }
  const { adapter, gameKey, lang } = resolved;
  const trimmed = query.trim();
  const { match, printingMatch } = storedSearchMatch(trimmed);
  const printingFilter =
    and(
      isNotNull(cardImageVectors.data),
      catalogPrintingIsListedSql(adapter),
      setCode ? eq(cardImageVectors.setCode, setCode) : undefined,
    ) ?? sql`true`;
  const matchFilter =
    and(
      eq(cardImageVectors.gameKey, gameKey),
      storedLanguageMatch(resolved),
      match,
      isNotNull(cardImageVectors.data),
      setCode ? eq(cardImageVectors.setCode, setCode) : undefined,
    ) ?? sql`true`;
  const result = await db.execute<GroupedCatalogSearchRow>(
    groupedCatalogSearchSql({
      adapter,
      gameKey,
      preferredLang: lang,
      matchFilter,
      printingFilter,
      printingMatch,
      exactName: trimmed,
      offset,
      limit: pageLimit + 1,
    }),
  );
  const hasMore = result.rows.length > pageLimit;
  const normalized = result.rows.slice(0, pageLimit).flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.card_id, row.lang);
    return card
      ? [{ card: { ...card, lang: row.lang }, printingCount: Number(row.printing_count) }]
      : [];
  });
  const pricedCards = await priceCardsByLanguage(
    adapter,
    gameKey,
    normalized.map(({ card }) => card),
    lang,
  );
  return {
    success: true,
    message: "Cards successfully retrieved.",
    data: {
      results: normalized.map(({ printingCount }, index) => ({
        card: pricedCards[index],
        printingCount,
      })),
      nextOffset: hasMore ? offset + pageLimit : null,
    },
  };
}

async function findStoredCardName(
  { gameKey, lang }: ResolvedCardSearch,
  cardId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ name: cardImageVectors.name })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        eq(cardImageVectors.cardId, cardId),
      ),
    )
    .limit(1);
  return row?.name ?? null;
}

async function listCardPrintingsUncached(
  resolved: ResolvedCardSearch,
  { cardId, cardName, offset }: { cardId?: string; cardName?: string; offset: number },
): Promise<Result<CardPrintingsPage>> {
  const { adapter, gameKey, lang } = resolved;
  const name = cardName?.trim() || (cardId ? await findStoredCardName(resolved, cardId) : null);
  if (!name) return { success: false, message: "Card not found." };
  const result = await db.execute<CardPrintingRow>(
    cardPrintingsSql({
      adapter,
      gameKey,
      lang,
      cardName: name,
      offset,
      limit: CARD_PRINTINGS_PAGE_SIZE,
    }),
  );
  const cards = result.rows.flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.card_id, row.lang);
    return card ? [{ ...card, lang: row.lang }] : [];
  });
  const totalCount = result.rows.length > 0 ? Number(result.rows[0].total_count) : offset;
  return {
    success: true,
    message: "Printings successfully retrieved.",
    data: {
      cards: await applyCardPrices(adapter, { gameKey, lang }, cards),
      totalCount,
      nextOffset: offset + CARD_PRINTINGS_PAGE_SIZE < totalCount ? offset + CARD_PRINTINGS_PAGE_SIZE : null,
    },
  };
}

export function searchCards(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
  setCode?: string,
): Promise<Result<CardSearchPage>> {
  return cardSearchCache.get(
    catalogCacheKey([...resolvedSearchCacheKeyParts(resolved), query, offset, setCode]),
    () => searchCardsUncached(resolved, query, offset, setCode),
  );
}

export function searchCardSets(
  resolved: ResolvedCardSearch,
  query: string,
): Promise<CardSetOption[]> {
  return cardSetSearchCache.get(
    catalogCacheKey([...resolvedSearchCacheKeyParts(resolved), query]),
    () => searchCardSetsUncached(resolved, query),
  );
}

export function searchCatalogCardsGroupedByName(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
  setCode?: string,
  pageLimit = STORED_SEARCH_LIMIT,
): Promise<Result<CatalogCardSearchPage>> {
  return groupedCatalogSearchCache.get(
    catalogCacheKey([...resolvedSearchCacheKeyParts(resolved), query, offset, setCode, pageLimit]),
    () => searchCatalogCardsGroupedByNameUncached(resolved, query, offset, setCode, pageLimit),
  );
}

export function listCardPrintings(
  resolved: ResolvedCardSearch,
  printingsQuery: { cardId?: string; cardName?: string; offset: number },
): Promise<Result<CardPrintingsPage>> {
  return cardPrintingsCache.get(
    catalogCacheKey([
      resolved.gameKey,
      resolved.lang,
      printingsQuery.cardId,
      printingsQuery.cardName,
      printingsQuery.offset,
    ]),
    () => listCardPrintingsUncached(resolved, printingsQuery),
  );
}
