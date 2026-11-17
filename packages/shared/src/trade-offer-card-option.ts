import type { PlayingCard } from "./interfaces/card.interface";
import type { OwnedCardSearchResult } from "./interfaces/owned-card-search.interface";
import type { TradeOfferCardOption } from "./interfaces/trade-offers.interface";

export function tradeOfferCardImageUrl(card: Pick<PlayingCard, "image">): string | null {
  return card.image?.small || card.image?.normal || null;
}

export function toTradeOfferCardOption(card: PlayingCard, gameKey: string): TradeOfferCardOption {
  return {
    gameKey,
    lang: card.lang ?? "en",
    cardId: card.id,
    name: card.name,
    setCode: card.set,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    imageUrl: tradeOfferCardImageUrl(card),
  };
}

export function ownedCardSearchSubtitle(result: OwnedCardSearchResult, foilLabel: string): string {
  return [
    result.setName || result.setCode?.toUpperCase(),
    result.collectorNumber ? `#${result.collectorNumber}` : null,
    result.isFoil ? foilLabel : null,
    result.locationName ?? result.collectionName,
  ]
    .filter(Boolean)
    .join(" · ");
}
