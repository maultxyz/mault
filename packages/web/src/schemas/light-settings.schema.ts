import {
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MODES,
  PRICE_SOURCES,
  VALUE_CELEBRATION_DURATION_MIN_MS,
  VALUE_CELEBRATION_DURATION_MAX_MS,
  LIGHT_TIMER_MIN_SECONDS,
  LIGHT_TIMER_MAX_SECONDS,
} from "@magic-vault/shared";
import { z } from "zod";

export const lightSettingsSchema = z.object({
  lightMode: z.enum(LIGHT_MODES),
  lightColor: z.string().regex(LIGHT_COLOR_PATTERN),
  lightBrightness: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
  lightWhite: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
  lightLedCount: z.union([z.literal(8), z.literal(16)]),
  valueCelebrationEnabled: z.boolean(),
  valueCelebrationThreshold: z.number().min(0),
  valueCelebrationPriceSource: z.enum(PRICE_SOURCES),
  valueCelebrationDurationMs: z.number().int().min(VALUE_CELEBRATION_DURATION_MIN_MS).max(VALUE_CELEBRATION_DURATION_MAX_MS),
  lightWarningsEnabled: z.boolean(),
  lightEmptyWarningSeconds: z.number().int().min(LIGHT_TIMER_MIN_SECONDS).max(LIGHT_TIMER_MAX_SECONDS),
  lightBlockedWarningSeconds: z.number().int().min(LIGHT_TIMER_MIN_SECONDS).max(LIGHT_TIMER_MAX_SECONDS),
  lightNormalSeconds: z.number().int().min(LIGHT_TIMER_MIN_SECONDS).max(LIGHT_TIMER_MAX_SECONDS),
});
