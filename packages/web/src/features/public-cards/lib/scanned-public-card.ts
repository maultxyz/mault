import {
  DEFAULT_CARD_CONDITION,
  type PublicCard,
  type ScannedCard,
} from "@magic-vault/shared";

export function toPublicCard(scannedCard: ScannedCard): PublicCard {
  return {
    scanId: scannedCard.scanId,
    card: scannedCard.card,
    isFoil: scannedCard.isFoil ?? false,
    foilType: scannedCard.foilType ?? null,
    stamp: scannedCard.stamp ?? null,
    condition: scannedCard.condition ?? DEFAULT_CARD_CONDITION,
    language: scannedCard.language ?? null,
  };
}
