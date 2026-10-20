import {
  LIGHT_BRIGHTNESS_MAX,
  LIGHT_COLOR_PATTERN,
  LIGHT_MODES,
} from "@magic-vault/shared";
import { z } from "zod";

export const lightSettingsSchema = z.object({
  lightMode: z.enum(LIGHT_MODES),
  lightColor: z.string().regex(LIGHT_COLOR_PATTERN),
  lightBrightness: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
});
