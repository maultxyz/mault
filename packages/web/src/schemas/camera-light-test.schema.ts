import { LIGHT_BRIGHTNESS_MAX, LIGHT_COLOR_PATTERN } from "@magic-vault/shared";
import { z } from "zod";

export const cameraLightTestSchema = z.object({
  lightMode: z.enum(["off", "white", "custom"]),
  lightColor: z.string().regex(LIGHT_COLOR_PATTERN),
  lightBrightness: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
  lightWhite: z.number().int().min(0).max(LIGHT_BRIGHTNESS_MAX),
});
