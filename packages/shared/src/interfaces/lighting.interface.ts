import type { LIGHT_MODES } from "../constants/lighting.constant";

export type LightMode = (typeof LIGHT_MODES)[number];

export interface LightSettings {
  lightMode: LightMode;
  lightColor: string;
  lightBrightness: number;
}
