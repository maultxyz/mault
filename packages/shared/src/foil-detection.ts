import {
  DETECTED_FOIL_TYPE_BY_GAME_KEY,
  FOIL_FINISH_LABEL,
} from "./constants/card-export.constant";
import { finishFamily, scanFoilType } from "./card-finishes";
import type { PlayingCard } from "./interfaces/card.interface";
import type { ScanFoilTypeInput } from "./interfaces/foil-detection.interface";

export function detectedFoilFamily(
  card: PlayingCard,
  fallbackFoilTypes: string[],
  gameKey: string | null | undefined,
): string {
  return (
    card.foilTypes?.map(finishFamily)[0] ??
    (gameKey ? DETECTED_FOIL_TYPE_BY_GAME_KEY[gameKey] : undefined) ??
    fallbackFoilTypes.map(finishFamily)[0] ??
    FOIL_FINISH_LABEL
  );
}

export function resolveScanFoilType({
  card,
  sessionFoilType,
  foilDetection,
  fallbackFoilTypes,
  gameKey,
  printedFoilMarker,
  isNudgeFoilDetectionEnabled,
  isFoilStarDetectionEnabled,
}: ScanFoilTypeInput): string | null {
  const isFoilDetected =
    !card.hasNoFoilPrinting &&
    ((isNudgeFoilDetectionEnabled && foilDetection?.isFoilDetected === true) ||
      (isFoilStarDetectionEnabled && printedFoilMarker?.marker === "star"));
  if (sessionFoilType || card.foilOnlyFoilType || !isFoilDetected) {
    return scanFoilType(card, sessionFoilType);
  }
  return scanFoilType(card, detectedFoilFamily(card, fallbackFoilTypes, gameKey));
}
