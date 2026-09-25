import type { PlayingCard, Result } from "@magic-vault/shared";
import { and, eq, ilike, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { applyTcgplayerPrices } from "./tcgplayer-prices";
import type { CardSearchAdapter } from "./types";
import { validateQuery } from "./validate";

const STORED_SEARCH_LIMIT = 60;

export interface ResolvedCardSearch {
  adapter: CardSearchAdapter;
  gameKey: string;
  baseUrl: string;
  lang: string;
}

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
  const [priced] = await applyTcgplayerPrices(adapter, [card]);
  return priced;
}

async function searchStoredCards(
  { adapter, gameKey, lang }: ResolvedCardSearch,
  query: string,
): Promise<PlayingCard[]> {
  const pattern = `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`;
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
    .orderBy(cardImageVectors.name, cardImageVectors.setCode)
    .limit(STORED_SEARCH_LIMIT);
  const cards = rows.flatMap((row) => {
    const card = adapter.normalizeStored(row.data, row.cardId, lang);
    return card ? [card] : [];
  });
  return applyTcgplayerPrices(adapter, cards);
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
  const [priced] = await applyTcgplayerPrices(resolved.adapter, [result.data]);
  return { ...result, data: priced };
}

export async function searchCards(
  resolved: ResolvedCardSearch,
  query: string,
): Promise<Result<PlayingCard[]>> {
  const invalid = validateQuery(query);
  if (invalid) return invalid;

  const cards = await searchStoredCards(resolved, query);
  if (cards.length === 0) {
    return {
      success: false,
      message: `No cards were found with the query: ${query}`,
    };
  }
  return {
    success: true,
    message: "Cards successfully retrieved.",
    data: cards,
  };
}
