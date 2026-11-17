import type { DBSchema } from "idb";
import type { CardContour, LightSettings, ScanRegion } from "@magic-vault/shared";
import type { useFoilCalibration } from "@/features/calibration/api/use-foil-calibration";

export interface FoilCaptureLabel {
  card: string;
  finish: "foil" | "nonfoil";
  sleeved: boolean;
  notes: string;
}

export interface FoilCaptureForm extends FoilCaptureLabel {
  brightness: number;
  captureMode: "color" | "brightness" | "direction" | "staged";
}

export interface FoilLighting extends LightSettings {
  ledMask?: number;
}

export interface FoilCaptureFrame {
  step: string;
  lighting: FoilLighting;
  capturedAt: string;
  width: number;
  height: number;
  image: string;
  meanBrightness: number;
  clippedFraction: number;
}

export interface FoilCalibrationSample {
  version: 1;
  id: string;
  orgId: string;
  deviceGuid: string;
  createdAt: string;
  label: FoilCaptureLabel;
  cameraSource: "local" | "phone";
  cameraLabel: string;
  cameraSettings: MediaTrackSettings | null;
  firmwareVersion: string | null;
  scanRegion: ScanRegion;
  settleMs: number;
  frames: FoilCaptureFrame[];
  analysis?: FoilSampleAnalysis;
}

export interface FoilCardMetrics {
  meanBrightness: number;
  clippedFraction: number;
  highlightFraction: number;
}

export interface FoilAnalyzedFrame {
  step: string;
  contour: CardContour | null;
  cardImage: string | null;
  metrics: FoilCardMetrics | null;
  reflections?: FoilReflectionMetrics;
  ambientResponse?: FoilAmbientResponse | null;
}

export interface FoilAmbientResponse {
  channelGains: number[];
  eligibleFraction: number;
  positiveMean: number;
  positiveP99: number;
  negativeMean: number;
}

export interface FoilReflectionMetrics {
  peakContrast: number;
  spotFraction: number;
  spotCount: number;
  largestSpotFraction: number;
  largestSpotCompactness: number;
}

export interface FoilWhiteComparison {
  meanShift: number;
  normalizedMae: number;
  cornerShiftFraction: number;
}

export interface FoilWhiteFrame {
  pixels: number[];
  contour: CardContour;
  width: number;
  height: number;
}

export interface FoilDirectionResponse {
  eligibleFraction: number;
  residualP99: number;
  glintFraction: number;
}

export type FoilVerdict = "foil" | "nonFoil" | "uncertain";

export interface FoilRainbowEvidence {
  rainbow: number;
  localRainbow: number;
}

export interface FoilReflectanceEvidence {
  score: number;
  eligibleFraction: number;
  changedFraction: number;
}

export interface FoilReflectanceAnalysis {
  first: FoilReflectanceEvidence | null;
  repeat: FoilReflectanceEvidence | null;
  led0Noise: FoilReflectanceEvidence | null;
  farNoise: FoilReflectanceEvidence | null;
}

export interface FoilDirectionAnalysis {
  response: FoilDirectionResponse | null;
  repeatNoise: FoilDirectionResponse | null;
  led0Comparison: FoilWhiteComparison | null;
  farLed?: number;
  farComparison?: FoilWhiteComparison | null;
  led3Comparison?: FoilWhiteComparison | null;
  rainbow?: number | null;
  rainbowRepeat?: number | null;
  localRainbow?: number | null;
  localRainbowRepeat?: number | null;
  reflectance?: FoilReflectanceAnalysis;
  verdict?: FoilVerdict;
}

export interface FoilSampleAnalysis {
  version: 1 | 2 | 3 | 4 | 5;
  frames: FoilAnalyzedFrame[];
  whiteComparison: FoilWhiteComparison | null;
  ambientComparison?: FoilWhiteComparison | null;
  brightComparison?: FoilWhiteComparison | null;
  direction?: FoilDirectionAnalysis;
  warnings: ("missingCard" | "clipping" | "exposure" | "movement" | "unstable" | "ambientUnstable" | "brightUnstable" | "directionUnstable")[];
}

export interface FoilCalibrationDatabase extends DBSchema {
  samples: {
    key: string;
    value: FoilCalibrationSample;
  };
}

export interface FoilCaptureStep {
  id: string;
  lighting: FoilLighting;
}

export interface FoilCaptureSequenceOptions {
  steps: readonly FoilCaptureStep[];
  restore: LightSettings;
  signal: AbortSignal;
  settleMs: number;
  setLight: (settings: FoilLighting) => Promise<void>;
  capture: (step: FoilCaptureStep) => Promise<FoilCaptureFrame>;
  wait: (ms: number, signal: AbortSignal) => Promise<void>;
  onStep: (id: string) => void;
}

export interface FoilCalibrationOptions {
  scanRegion: ScanRegion;
  captureSettleDelayMs: number;
  disabled: boolean;
}

export interface FoilCalibrationPanelProps {
  calibration: ReturnType<typeof useFoilCalibration>;
}
