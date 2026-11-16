import type { PlayingCard } from "@magic-vault/shared";
import {
  ONE_PIECE_FOIL_VARIANT_NAME_PATTERN,
  ONE_PIECE_RARITIES_WITHOUT_FOIL_BASE_PRINTING,
  ONE_PIECE_REPRINT_CARD_ID_PATTERN,
  ONE_PIECE_REPRINT_NAME_PATTERN,
  ONE_PIECE_TEXTURED_FOIL_NAME_PATTERN,
} from "../../constants/onepiece";
import type { FoilPrintingVariants } from "../../interfaces/card-search";
import type { OptcgCard } from "../../interfaces/onepiece";
import { onePiecePrintedId } from "./printed-id";

function cardNameOf(card: PlayingCard): string {
  return (card.raw as Partial<OptcgCard> | undefined)?.card_name ?? card.name;
}

export function isOnePieceFoilVariant(card: PlayingCard): boolean {
  return ONE_PIECE_FOIL_VARIANT_NAME_PATTERN.test(cardNameOf(card));
}

export function isOnePieceReprint(card: PlayingCard): boolean {
  return (
    ONE_PIECE_REPRINT_CARD_ID_PATTERN.test(card.id) ||
    ONE_PIECE_REPRINT_NAME_PATTERN.test(cardNameOf(card))
  );
}

function isTexturedFoil(card: PlayingCard): boolean {
  return ONE_PIECE_TEXTURED_FOIL_NAME_PATTERN.test(cardNameOf(card));
}

function sharesBaseArtwork(card: PlayingCard): boolean {
  return (
    isOnePieceFoilVariant(card) ||
    isOnePieceReprint(card) ||
    onePiecePrintedId(card.id) === card.id
  );
}

export const onePieceFoilPrintingVariants: FoilPrintingVariants = {
  isSameArtwork(card, other) {
    return (
      onePiecePrintedId(card.id) === onePiecePrintedId(other.id) &&
      sharesBaseArtwork(card) &&
      sharesBaseArtwork(other) &&
      (!isTexturedFoil(other) || isTexturedFoil(card))
    );
  },
  matchesFoilType(card, foilType) {
    if (isOnePieceFoilVariant(card)) return foilType !== null;
    if (foilType === null) return true;
    return !ONE_PIECE_RARITIES_WITHOUT_FOIL_BASE_PRINTING.includes(
      card.rarity ?? "",
    );
  },
};
