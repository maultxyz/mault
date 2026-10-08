import type { PlayingCard, ScannedCard } from "@magic-vault/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cardPrices } from "../../db/schema";
import type {
  CardPriceScope,
  StoredCardPrices,
} from "../interfaces/card-prices";
import type { CardSearchAdapter } from "../interfaces/card-search";
import { applyCardmarketPrices } from "./cardmarket-prices";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";
import { applyTcgplayerPrices } from "./tcgplayer-prices";

export async function resolveLiveCardPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  return applyCardmarketPrices(
    adapter,
    await applyTcgplayerPrices(adapter, cards),
  );
}

async function loadStoredCardPrices(
  { gameKey, lang }: CardPriceScope,
  cardIds: string[],
): Promise<Map<string, StoredCardPrices>> {
  const ids = [...new Set(cardIds)];
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      cardId: cardPrices.cardId,
      price: cardPrices.price,
      priceFoil: cardPrices.priceFoil,
      priceEur: cardPrices.priceEur,
      priceEurFoil: cardPrices.priceEurFoil,
      details: cardPrices.details,
    })
    .from(cardPrices)
    .where(
      and(
        eq(cardPrices.gameKey, gameKey),
        eq(cardPrices.lang, lang),
        inArray(cardPrices.cardId, ids),
      ),
    );
  return new Map(rows.map(({ cardId, ...prices }) => [cardId, prices]));
}

function withStoredPrices<T extends PlayingCard>(
  card: T,
  stored: StoredCardPrices,
): T {
  const details = stored.details ?? {};
  return {
    ...card,
    price: stored.price ?? card.price,
    priceFoil: stored.priceFoil ?? card.priceFoil,
    priceEur: stored.priceEur ?? card.priceEur,
    priceEurFoil: stored.priceEurFoil ?? card.priceEurFoil,
    priceRange: details.priceRange ?? card.priceRange,
    priceRangeFoil: details.priceRangeFoil ?? card.priceRangeFoil,
    cardmarketPrice: details.cardmarketPrice ?? card.cardmarketPrice,
    cardmarketPriceFoil:
      details.cardmarketPriceFoil ?? card.cardmarketPriceFoil,
  };
}

export async function applyCardPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  scope: CardPriceScope,
  cards: T[],
): Promise<T[]> {
  if (cards.length === 0) return cards;
  const stored = await loadStoredCardPrices(
    scope,
    cards.map((card) => card.id),
  );
  const needsLive = (card: T) => !stored.has(card.id) && card.raw != null;
  const live = cards.filter(needsLive);
  const priced =
    live.length > 0 ? await resolveLiveCardPrices(adapter, live) : [];

  let next = 0;
  return cards.map((card) => {
    const prices = stored.get(card.id);
    if (prices) return withStoredPrices(card, prices);
    return needsLive(card) ? priced[next++] : card;
  });
}

export async function applyCardPricesToScans<T extends ScannedCard>(
  gameKey: string | null | undefined,
  lang: string,
  scans: T[],
): Promise<T[]> {
  const adapter = gameKey ? ADAPTERS_BY_GAME_KEY[gameKey] : undefined;
  if (!adapter || !gameKey) return scans;
  const cards = await applyCardPrices(
    adapter,
    { gameKey, lang },
    scans.map((scan) => scan.card),
  );
  return scans.map((scan, i) => ({ ...scan, card: cards[i] }));
}
