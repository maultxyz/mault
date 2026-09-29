import type { PlayingCard, ScannedCard } from "@magic-vault/shared";
import { applyCardmarketPrices } from "./cardmarket-prices";
import { ADAPTERS_BY_GAME_KEY } from "./resolve";
import { applyTcgplayerPrices } from "./tcgplayer-prices";
import type { CardSearchAdapter } from "./types";

export async function applyCardPrices<T extends PlayingCard>(
  adapter: CardSearchAdapter,
  cards: T[],
): Promise<T[]> {
  const priceable = cards.filter((card) => card.raw != null);
  if (priceable.length === 0) return cards;

  const priced = await applyCardmarketPrices(
    adapter,
    await applyTcgplayerPrices(adapter, priceable),
  );
  let next = 0;
  return cards.map((card) => (card.raw != null ? priced[next++] : card));
}

export async function applyCardPricesToScans<T extends ScannedCard>(
  gameKey: string | null | undefined,
  scans: T[],
): Promise<T[]> {
  const adapter = gameKey ? ADAPTERS_BY_GAME_KEY[gameKey] : undefined;
  if (!adapter) return scans;
  const cards = await applyCardPrices(
    adapter,
    scans.map((scan) => scan.card),
  );
  return scans.map((scan, i) => ({ ...scan, card: cards[i] }));
}
