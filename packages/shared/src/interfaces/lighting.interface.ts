import type { LIGHT_MODES } from "../constants/lighting.constant";
import type { PriceSource } from "./price-source.interface";

export type LightMode = (typeof LIGHT_MODES)[number];

export interface LightSettings {
  lightMode: LightMode;
  lightColor: string;
  lightBrightness: number;
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

export interface LightingDraft extends LightSettings, ValueCelebrationSettings, LightWarningSettings {}
