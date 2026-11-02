import {
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MODES,
  PRICE_SOURCES,
  VALUE_CELEBRATION_DURATION_MIN_MS,
  VALUE_CELEBRATION_DURATION_MAX_MS,
} from "@magic-vault/shared";
import { z } from "zod";

export const lightSettingsSchema = z.object({
  lightMode: z.enum(LIGHT_MODES),
  lightColor: z.string().regex(LIGHT_COLOR_PATTERN),
  lightBrightness: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
  valueCelebrationEnabled: z.boolean(),
  valueCelebrationThreshold: z.number().min(0),
  valueCelebrationPriceSource: z.enum(PRICE_SOURCES),
  valueCelebrationDurationMs: z.number().int().min(VALUE_CELEBRATION_DURATION_MIN_MS).max(VALUE_CELEBRATION_DURATION_MAX_MS),
});
