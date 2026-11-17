import type { FoilCaptureStep } from "@/lib/interfaces/foil-calibration";

export const FOIL_CALIBRATION_SAMPLE_LIMIT = 20;
export const FOIL_ANALYSIS_VERSION = 5;
export const FOIL_CALIBRATION_MAX_DIMENSION = 960;
export const FOIL_CALIBRATION_SETTLE_MS = 1000;
export const FOIL_CALIBRATION_DEFAULT_BRIGHTNESS = 48;
export const FOIL_BRIGHTNESS_STEPS: readonly FoilCaptureStep[] = [
  { id: "ambient", lighting: { lightMode: "off", lightColor: "#000000", lightBrightness: 4 } },
  { id: "white", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 4 } },
  { id: "whiteBright", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 12 } },
  { id: "whiteRepeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 4 } },
  { id: "whiteBrightRepeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 12 } },
  { id: "ambientRepeat", lighting: { lightMode: "off", lightColor: "#000000", lightBrightness: 4 } },
];
export const FOIL_DIRECTION_LED_MASKS = { led0: 1, diffuse: 0xFF7E, led7: 0X0080 } as const;
export const FOIL_DIRECTION_FAR_LEDS = [
  { led: 7, step: "led7", repeat: "led7Repeat" },
  { led: 4, step: "led4", repeat: "led4Repeat" },
  { led: 3, step: "led3", repeat: "led3Repeat" },
] as const;
export const FOIL_DIRECTION_FRAMES: readonly string[] = ["led0", "led0Repeat", ...FOIL_DIRECTION_FAR_LEDS.flatMap((far) => [far.step, far.repeat])];
export const FOIL_DIRECTION_STEPS: readonly FoilCaptureStep[] = [
  { id: "ambient", lighting: { lightMode: "off", lightColor: "#000000", lightBrightness: 12, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "whiteBright", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 12, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "diffuse", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "led0", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.led0 } },
  { id: "led7", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.led7 } },
  { id: "led0Repeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.led0 } },
  { id: "led7Repeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.led7 } },
];
export const FOIL_STAGED_STEPS: readonly FoilCaptureStep[] = [
  FOIL_DIRECTION_STEPS[0],
  { id: "whiteBright", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "white", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 8, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "whiteHigh", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 96, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  { id: "whiteBrightRepeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 32, ledMask: FOIL_DIRECTION_LED_MASKS.diffuse } },
  ...FOIL_DIRECTION_STEPS.filter((step) => FOIL_DIRECTION_FRAMES.includes(step.id)),
];
export const FOIL_DIRECTION_SETTINGS = {
  darkLevel: 16,
  logOffset: 4,
  radius: 8,
  glintThreshold: 0.4,
  minimumEligibleFraction: 0.25,
} as const;
export const FOIL_RAINBOW_SETTINGS = {
  amplitude: 0.08,
  chromaDistance: 0.2,
  minimumPixels: 30,
  localRadius: 8,
  localChromaDistance: 0.15,
} as const;
export const FOIL_REFLECTANCE_SETTINGS = {
  logOffset: 0.01,
  darkLevel: 32,
  clippingLevel: 250,
  minimumChange: 16,
  chromaResidual: 0.6,
  minimumEligibleFraction: 0.25,
  minimumChangedFraction: 0.25,
} as const;
export const FOIL_VERDICT_LIMITS = {
  foilMinimum: 18,
  nonFoilMaximum: 12,
} as const;
export const FOIL_VERDICT_BADGE_VARIANTS = {
  foil: "default",
  nonFoil: "secondary",
  uncertain: "outline",
} as const;
export const FOIL_ANALYSIS_WIDTH = 160;
export const FOIL_ANALYSIS_HEIGHT = 224;
export const FOIL_ANALYSIS_INSET = 0.06;
export const FOIL_AMBIENT_SETTINGS = {
  minimumChannel: 16,
  maximumChannel: 239,
  minimumEligibleFraction: 0.25,
} as const;
export const FOIL_REFLECTION_SETTINGS = {
  radius: 6,
  minimumIntensity: 0.55,
  minimumContrast: 0.2,
  minimumArea: 3,
} as const;
export const FOIL_QUALITY_LIMITS = {
  clipping: 0.02,
  exposure: 0.05,
  movement: 0.01,
  normalizedMae: 0.04,
  geometry: 0.03,
} as const;
export const FOIL_CALIBRATION_STEPS: readonly FoilCaptureStep[] = [
  { id: "ambient", lighting: { lightMode: "off", lightColor: "#000000", lightBrightness: 96 } },
  { id: "white", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 96 } },
  { id: "red", lighting: { lightMode: "custom", lightColor: "#ff0000", lightBrightness: 96 } },
  { id: "green", lighting: { lightMode: "custom", lightColor: "#00ff00", lightBrightness: 96 } },
  { id: "blue", lighting: { lightMode: "custom", lightColor: "#0000ff", lightBrightness: 96 } },
  { id: "whiteRepeat", lighting: { lightMode: "white", lightColor: "#ffffff", lightBrightness: 96 } },
];
