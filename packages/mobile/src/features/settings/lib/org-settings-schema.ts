import { z } from "zod";
import {
  CARD_CONDITIONS,
  isConditionMultiplier,
  PRICE_SOURCES,
  type ConditionMultipliers,
  type PriceSource,
} from "@magic-vault/shared";

export const orgSettingsDraftSchema = z.object({
  primaryColor: z.string().nullable(),
  scannerLayout: z.enum(["horizontal", "vertical"]),
  priceSource: z.custom<PriceSource>((value) => PRICE_SOURCES.includes(value as PriceSource)),
  sessionWrappedEnabled: z.boolean(),
  ocrEnabled: z.boolean(),
  correctionBinPrompt: z.boolean(),
  pauseScanningOnDeploy: z.boolean(),
  leaderboardOptIn: z.boolean(),
  correctionAutoCloseSeconds: z.number().int().positive().nullable(),
  conditionMultipliers: z.custom<ConditionMultipliers>(
    (value) =>
      !!value &&
      typeof value === "object" &&
      CARD_CONDITIONS.every((condition) => isConditionMultiplier((value as Record<string, unknown>)[condition])),
  ),
});
