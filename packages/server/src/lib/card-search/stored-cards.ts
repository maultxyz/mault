import type { CardSearchPage, PlayingCard, Result } from "@magic-vault/shared";
import { and, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { STORED_SEARCH_LIMIT } from "../constants/card-search";
import { applyCardPrices } from "./card-prices";
import type { ResolvedCardSearch } from "./types";
import { validateQuery } from "./validate";

async function findStoredCard(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  cardId: string,
): Promise<PlayingCard | null> {
  const [row] = await db
    .select({ data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        eq(cardImageVectors.cardId, cardId),
        isNotNull(cardImageVectors.data),
      ),
    )
    .limit(1);
  const card = row ? adapter.normalizeStored(row.data, cardId, lang) : null;
  if (!card) return null;
  const [priced] = await applyCardPrices(adapter, [card]);
  return priced;
}

async function searchStoredCards(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  query: string,
  offset: number,
): Promise<CardSearchPage> {
  const trimmed = query.trim();
  const pattern = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, gameKey),
        eq(cardImageVectors.lang, lang),
        ilike(cardImageVectors.name, pattern),
        isNotNull(cardImageVectors.data),
      ),
    )
    .orderBy(
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
    cards: await applyCardPrices(adapter, cards),
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

export async function searchCardById(
  resolved: ResolvedCardSearch,
  id: string,
): Promise<Result<PlayingCard>> {
  const stored = await findStoredCard(resolved, id);
  if (stored) {
    return {
      success: true,
      message: "Successfully fetched card by id.",
      data: stored,
    };
  }
  const result = await resolved.adapter.searchById(id, resolved.baseUrl);
  if (!result.success || !result.data) return result;
  const [priced] = await applyCardPrices(resolved.adapter, [result.data]);
  return { ...result, data: priced };
}

export async function searchCards(
  resolved: ResolvedCardSearch,
  query: string,
  offset = 0,
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
    const priced = await applyCardPrices(resolved.adapter, result.data);
    return { ...result, data: { cards: priced, nextOffset: null } };
  }

  const page = await searchStoredCards(resolved, query, offset);
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
