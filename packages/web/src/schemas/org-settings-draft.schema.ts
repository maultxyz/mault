import {
  CARD_CONDITIONS,
  isConditionMultiplier,
  PRICE_SOURCES,
  type ConditionMultipliers,
  type PriceSource,
} from "@magic-vault/shared";
import { z } from "zod";

export const orgSettingsDraftSchema = z.object({
  primaryColor: z.string().nullable(),
  scannerLayout: z.enum(["horizontal", "vertical"]),
  priceSource: z.custom<PriceSource>((value) =>
    PRICE_SOURCES.includes(value as PriceSource),
  ),
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
      CARD_CONDITIONS.every((condition) =>
        isConditionMultiplier(
          (value as Record<string, unknown>)[condition],
        ),
      ),
    "Each condition needs a percentage from 0 to 100.",
  ),
});

export type OrgSettingsDraftValues = z.infer<typeof orgSettingsDraftSchema>;
