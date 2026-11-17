import type { PlayingCard } from "@magic-vault/shared";
import {
  SCRYFALL_ETCHED_FINISH,
  SCRYFALL_FOIL_PROMO_TYPES,
  SCRYFALL_FOIL_TYPE_ALIASES,
} from "../../constants/card-search";
import type { FoilPrintingVariants } from "../../interfaces/card-search";
import type { ScryfallApiCard } from "../../interfaces/scryfall";

function rawOf(card: PlayingCard): ScryfallApiCard | undefined {
  return card.raw as ScryfallApiCard | undefined;
}

export function scryfallFoilTreatment(foilType: string): string | null {
  const key = foilType.toLowerCase().replace(/[^a-z]/g, "");
  if (SCRYFALL_FOIL_TYPE_ALIASES[key]) return SCRYFALL_FOIL_TYPE_ALIASES[key];
  if (key === SCRYFALL_ETCHED_FINISH) return SCRYFALL_ETCHED_FINISH;
  if (SCRYFALL_FOIL_PROMO_TYPES.includes(key)) return key;
  if (SCRYFALL_FOIL_PROMO_TYPES.includes(`${key}foil`)) return `${key}foil`;
  return null;
}

export const scryfallFoilPrintingVariants: FoilPrintingVariants = {
  isSameArtwork(card, other) {
    const raw = rawOf(card);
    const otherRaw = rawOf(other);
    return (
      !!raw?.illustration_id &&
      raw.illustration_id === otherRaw?.illustration_id &&
      raw.set === otherRaw.set
    );
  },
  matchesFoilType(card, foilType) {
    const raw = rawOf(card);
    if (!raw?.finishes) return true;
    if (foilType === null) return raw.finishes.includes("nonfoil");
    const treatment = scryfallFoilTreatment(foilType);
    if (treatment === SCRYFALL_ETCHED_FINISH) {
      return raw.finishes.includes(SCRYFALL_ETCHED_FINISH);
    }
    if (!raw.finishes.includes("foil")) return false;
    const foilPromoTypes = (raw.promo_types ?? []).filter((promoType) =>
      SCRYFALL_FOIL_PROMO_TYPES.includes(promoType),
    );
    return treatment
      ? foilPromoTypes.includes(treatment)
      : foilPromoTypes.length === 0;
  },
};
