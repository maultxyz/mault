import type {
  CardSearchPage,
  CardSetOption,
  PlayingCard,
  Result,
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
import { applyCardPrices } from "./card-prices";
import { listCardSets } from "./card-sets";
import type { ResolvedCardSearch } from "../interfaces/card-search";
import { validateQuery } from "./validate";
import { parsePrintingQueries } from "./printing-query";
import type { PrintingQuery } from "../interfaces/card-search";

async function findStoredCards(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  cardIds: string[],
): Promise<Map<string, PlayingCard>> {
  const ids = [...new Set(cardIds)];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        inArray(cardImageVectors.cardId, ids),
        isNotNull(cardImageVectors.data),
      ),
    );
  const cards = rows.flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.cardId, lang);
    return card ? [{ cardId: row.cardId, card }] : [];
  });
  const priced = await applyCardPrices(
    adapter,
    { gameKey, lang },
    cards.map(({ card }) => card),
  );
  return new Map(cards.map(({ cardId }, i) => [cardId, priced[i]]));
}

function numberMatches(number: string): SQL {
  const collectorNumber = sql`lower(${cardImageVectors.collectorNumber})`;
  const wanted = number.toLowerCase();
  return sql`(${collectorNumber} = ${wanted} OR ltrim(${collectorNumber}, '0') = ltrim(${wanted}, '0'))`;
}

function printingMatches({ setCode, number }: PrintingQuery): SQL {
  if (!setCode) return numberMatches(number);
  const collectorNumber = sql`lower(${cardImageVectors.collectorNumber})`;
  const set = setCode.toLowerCase();
  const wanted = number.toLowerCase();
  return sql`(lower(${cardImageVectors.setCode}) = ${set} AND (${numberMatches(number)} OR ${collectorNumber} = ${`${set}-${wanted}`} OR ${collectorNumber} = ${`${set}${wanted}`}))`;
}

function storedSearchMatch(trimmed: string) {
  const pattern = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const printingQueries = parsePrintingQueries(trimmed);
  const printingMatch = printingQueries.length
    ? or(...printingQueries.map(printingMatches))
    : undefined;
  const setMatch = printingQueries.some((q) => !q.setCode)
    ? sql`lower(${cardImageVectors.setCode}) = ${trimmed.toLowerCase()}`
    : undefined;
  return {
    printingMatch,
    match: or(ilike(cardImageVectors.name, pattern), printingMatch, setMatch),
  };
}

async function searchStoredCards(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  query: string,
  offset: number,
  setCode?: string,
): Promise<CardSearchPage> {
  const trimmed = query.trim();
  const { match, printingMatch } = storedSearchMatch(trimmed);
  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
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
      cardImageVectors.cardId,
    )
    .offset(offset)
    .limit(STORED_SEARCH_LIMIT + 1);
  const hasMore = rows.length > STORED_SEARCH_LIMIT;
  const cards = rows.slice(0, STORED_SEARCH_LIMIT).flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.cardId, lang);
    return card ? [card] : [];
  });
  return {
    cards: await applyCardPrices(adapter, { gameKey, lang }, cards),
    nextOffset: hasMore ? offset + STORED_SEARCH_LIMIT : null,
  };
}

async function hasStoredCards({
  gameKey,
  lang,
}: ResolvedCardSearch): Promise<boolean> {
  const [row] = await db
    .select({ id: cardImageVectors.id })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        isNotNull(cardImageVectors.data),
      ),
    )
    .limit(1);
  return !!row;
}

async function fetchUpstreamCard(
  resolved: ResolvedCardSearch,
  id: string,
): Promise<Result<PlayingCard>> {
  const result = await resolved.adapter.searchById(id, resolved.baseUrl);
  if (!result.success || !result.data) return result;
  const [priced] = await applyCardPrices(resolved.adapter, resolved, [
    result.data,
  ]);
  return { ...result, data: priced };
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
  if (stored) {
    return {
      success: true,
      message: "Successfully fetched card by id.",
      data: stored,
    };
  }
  return fetchUpstreamCard(resolved, id);
}

export async function searchCardsByIds(
  resolved: ResolvedCardSearch,
  ids: string[],
): Promise<Map<string, PlayingCard>> {
  const stored = await findStoredCards(resolved, ids);
  const missing = [...new Set(ids)].filter((id) => !stored.has(id));
  const fetched = await Promise.all(
    missing.map(
      async (id) => [id, await fetchUpstreamCard(resolved, id)] as const,
    ),
  );
  for (const [id, result] of fetched) {
    if (result.success && result.data) stored.set(id, result.data);
  }
  return stored;
}

export async function searchCards(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
  setCode?: string,
): Promise<Result<CardSearchPage>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  if (!(await hasStoredCards(resolved))) {
    if (offset > 0) {
      return {
        success: true,
        message: "Cards successfully retrieved.",
        data: { cards: [], nextOffset: null },
      };
    }
    const result = await resolved.adapter.search(
      query,
      resolved.baseUrl,
      resolved.lang,
    );
    if (!result.success || !result.data) return { ...result, data: undefined };
    const priced = await applyCardPrices(
      resolved.adapter,
      resolved,
      setCode
        ? result.data.filter((card) => card.set === setCode)
        : result.data,
    );
    return { ...result, data: { cards: priced, nextOffset: null } };
  }

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

export async function searchCardSets(
  resolved: ResolvedCardSearch,
  query: string,
): Promise<CardSetOption[]> {
  if (validateQuery(query)) return [];
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
        eq(cardImageVectors.lang, resolved.lang),
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
