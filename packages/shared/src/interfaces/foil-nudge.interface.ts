export interface FoilNudgeMeasurement {
  meanCellChange: number;
  changedCellShare: number;
  maxCellChange: number;
  colourOnlyChange: number;
}

export type FoilNudgeDirection = "left" | "right";

export interface FoilNudgeImages {
  beforeDataUrl: string;
  afterDataUrlByDirection: Partial<Record<FoilNudgeDirection, string>>;
}

export interface FoilNudgeFirmwareLimits {
  maxPulse: number;
  maxTravelPercent: number;
}

export interface FoilNudgeCommand {
  direction: FoilNudgeDirection;
  command: object;
}

export interface FoilNudgeCommands {
  nudges: FoilNudgeCommand[];
  restorePusher: object;
}
