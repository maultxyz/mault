import type { LIGHT_LED_COUNTS, LIGHT_MODES } from "../constants/lighting.constant";
import type { PriceSource } from "./price-source.interface";

export type LightMode = (typeof LIGHT_MODES)[number];
export type LightLedCount = (typeof LIGHT_LED_COUNTS)[number];

export interface LightSettings {
  lightMode: LightMode;
  lightColor: string;
  lightBrightness: number;
  lightWhite?: number;
  lightLedCount?: LightLedCount;
}

export interface ValueCelebrationSettings {
  valueCelebrationEnabled: boolean;
  valueCelebrationThreshold: number;
  valueCelebrationPriceSource: PriceSource;
  valueCelebrationDurationMs: number;
}

export interface LightWarningSettings {
  lightWarningsEnabled: boolean;
  lightEmptyWarningSeconds: number;
  lightBlockedWarningSeconds: number;
  lightNormalSeconds: number;
}

export interface LightingDraft extends LightSettings, ValueCelebrationSettings, LightWarningSettings {
  lightWhite: number;
  lightLedCount: LightLedCount;
}
