import { FOIL_FINISH_LABEL, type PlayingCard } from "@magic-vault/shared";
import {
  FAB_STANDARD_FOILING,
  FAB_TCGPLAYER_FOIL_NAMES,
} from "../../constants/card-search";
import type { FoilPrintingVariants } from "../../interfaces/card-search";
import type { FabCard, FabPrinting } from "../../interfaces/fleshcube";

function fabRawOf(
  card: PlayingCard,
): { card?: FabCard; printing?: FabPrinting } | undefined {
  return card.raw as { card?: FabCard; printing?: FabPrinting } | undefined;
}

export const fabFoilPrintingVariants: FoilPrintingVariants = {
  isSameArtwork(card, other) {
    const raw = fabRawOf(card);
    const otherRaw = fabRawOf(other);
    return (
      !!raw?.card?.unique_id &&
      raw.card.unique_id === otherRaw?.card?.unique_id &&
      raw.printing?.set_id === otherRaw.printing?.set_id &&
      (raw.printing?.art_variations ?? []).join(",") ===
        (otherRaw.printing?.art_variations ?? []).join(",")
    );
  },
  matchesFoilType(card, foilType) {
    const printing = fabRawOf(card)?.printing;
    if (!printing) return true;
    const isStandard = printing.foiling === FAB_STANDARD_FOILING;
    if (foilType === null) return isStandard;
    if (isStandard) return false;
    if (foilType === FOIL_FINISH_LABEL) return true;
    return (
      (FAB_TCGPLAYER_FOIL_NAMES[printing.foiling] ?? "").toLowerCase() ===
      foilType.toLowerCase()
    );
  },
};
