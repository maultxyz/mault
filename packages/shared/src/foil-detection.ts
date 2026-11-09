import { FOIL_FINISH_LABEL } from "./constants/card-export.constant";
import { finishFamily, scanFoilType } from "./card-finishes";
import type { PlayingCard } from "./interfaces/card.interface";
import type { FoilDetection } from "./interfaces/foil-detection.interface";
import type { PrintedFoilMarkerDetection } from "./interfaces/printed-foil-marker.interface";

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
  printedFoilMarker?: Pick<PrintedFoilMarkerDetection, "marker"> | null,
): string | null {
  const isFoilDetected =
    foilDetection?.isFoilDetected === true ||
    printedFoilMarker?.marker === "star";
  if (sessionFoilType || card.foilOnlyFoilType || !isFoilDetected) {
    return scanFoilType(card, sessionFoilType);
  }
  return scanFoilType(card, detectedFoilFamily(card, fallbackFoilTypes));
}
