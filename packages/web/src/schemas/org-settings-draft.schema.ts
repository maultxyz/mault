import { PRICE_SOURCES, type PriceSource } from "@magic-vault/shared";
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
  correctionAutoCloseSeconds: z.number().int().positive().nullable(),
});

export type OrgSettingsDraftValues = z.infer<typeof orgSettingsDraftSchema>;
