import type {
  FoilNudgeDirection,
  FoilNudgeImages,
  FoilNudgeMeasurement,
} from "./foil-nudge.interface";

export interface FoilFeatures {
  lowerHueSpread: number;
  lowerStronglyColoredShare: number;
  lowerStrongHueCount: number;
}

export type FoilDetectionMethod = "rainbow" | "nudge";

export interface FoilDetection {
  method: FoilDetectionMethod;
  foilScore: number;
  isFoilDetected: boolean;
  nudgeChange?: FoilNudgeMeasurement;
  nudgeChangesByDirection?: Partial<Record<FoilNudgeDirection, FoilNudgeMeasurement>>;
  nudgeImages?: FoilNudgeImages;
}
