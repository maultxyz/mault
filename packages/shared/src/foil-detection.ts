import { FOIL_FINISH_LABEL } from "./constants/card-export.constant";
import { finishFamily, scanFoilType } from "./card-finishes";
import type { PlayingCard } from "./interfaces/card.interface";
import type { FoilDetection } from "./interfaces/foil-detection.interface";

export function detectedFoilFamily(
  card: PlayingCard,
  fallbackFoilTypes: string[],
): string {
  return (
    card.foilTypes?.map(finishFamily)[0] ??
    fallbackFoilTypes.map(finishFamily)[0] ??
    FOIL_FINISH_LABEL
  );
}

export function resolveScanFoilType(
  card: PlayingCard,
  sessionFoilType: string | null,
  foilDetection: FoilDetection | null | undefined,
  fallbackFoilTypes: string[],
): string | null {
  if (sessionFoilType || card.foilOnlyFoilType || !foilDetection?.isFoilDetected) {
    return scanFoilType(card, sessionFoilType);
  }
  return scanFoilType(card, detectedFoilFamily(card, fallbackFoilTypes));
}
