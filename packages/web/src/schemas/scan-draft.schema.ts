import { CARD_CONDITIONS, type CardCondition } from "@magic-vault/shared";
import { z } from "zod";

export const scanDraftSchema = z.object({
  foilType: z.string().nullable(),
  condition: z.enum(CARD_CONDITIONS as [CardCondition, ...CardCondition[]]),
});

export type ScanDraftValues = z.infer<typeof scanDraftSchema>;
