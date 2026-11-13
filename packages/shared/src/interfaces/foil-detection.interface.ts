import type { PlayingCard } from "./card.interface";
import type {
  FoilNudgeDirection,
  FoilNudgeImages,
  FoilNudgeMeasurement,
} from "./foil-nudge.interface";
import type { PrintedFoilMarkerDetection } from "./printed-foil-marker.interface";

export type FoilDetectionMethod = "rainbow" | "nudge";

export interface FoilDetection {
  method: FoilDetectionMethod;
  foilScore: number;
  isFoilDetected: boolean;
  nudgeChange?: FoilNudgeMeasurement;
  nudgeChangesByDirection?: Partial<Record<FoilNudgeDirection, FoilNudgeMeasurement>>;
  nudgeImages?: FoilNudgeImages;
}

export interface ScanFoilTypeInput {
  card: PlayingCard;
  sessionFoilType: string | null;
  foilDetection: FoilDetection | null | undefined;
  fallbackFoilTypes: string[];
  gameKey: string | null | undefined;
  printedFoilMarker?: Pick<PrintedFoilMarkerDetection, "marker"> | null;
  isNudgeFoilDetectionEnabled: boolean;
  isFoilStarDetectionEnabled: boolean;
}
