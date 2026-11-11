import { DEFAULT_CARD_CONDITION, type Collection, type PlayingCard, type CardCondition } from "@magic-vault/shared";
import type { NewOfferedTradeCard } from "@/lib/interfaces/trade";

export function toOfferedTradeCard(
  card: PlayingCard,
  collection: Collection,
  finish: { condition?: CardCondition | null; isFoil?: boolean | null },
): NewOfferedTradeCard | null {
  const gameKey = collection.game?.key;
  if (!gameKey) return null;
  return {
    gameKey,
    lang: card.lang ?? collection.lang,
    cardId: card.id,
    name: card.name,
    setCode: card.set,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    imageUrl: card.image?.small ?? card.image?.normal ?? null,
    condition: finish.condition ?? DEFAULT_CARD_CONDITION,
    isFoil: finish.isFoil ?? false,
  };
}
