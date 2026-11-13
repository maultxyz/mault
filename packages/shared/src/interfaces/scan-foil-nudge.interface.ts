import type { FoilDetection } from "./foil-detection.interface";
import type { FoilNudgeFirmwareLimits } from "./foil-nudge.interface";
import type { ServoCalibration } from "./module-configs.interface";
import type { RgbaImage } from "./vision-model.interface";

export interface ScanFoilNudgeInput {
  gameKey: string | null | undefined;
  forceFoilType?: string | null;
  foilOnlyFoilType?: string | null;
  isReady: boolean;
  firmwareVersion: string | null | undefined;
  calibration: ServoCalibration | null | undefined;
  firmwareLimits: FoilNudgeFirmwareLimits | null | undefined;
  before: RgbaImage;
  sendCommand: (command: object, timeoutMs: number) => Promise<{ sent: boolean; line: string }>;
  capture: () => Promise<RgbaImage | null>;
  prepareMotion?: () => Promise<void>;
  delay: (ms: number) => Promise<void>;
  isActive?: () => boolean;
  encodeDiagnostics?: (image: RgbaImage) => string | null | Promise<string | null>;
}

export type ScanFoilNudgeResult = FoilDetection | null;
