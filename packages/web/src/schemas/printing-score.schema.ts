import {
  PRINTING_SCORE_CARD_ID_MAX_LENGTH,
  PRINTING_SCORE_SET_CODE_MAX_LENGTH,
} from "@magic-vault/shared";
import { z } from "zod";

export const printingScoreSchema = z.object({
  setCode: z.string().trim().min(1).max(PRINTING_SCORE_SET_CODE_MAX_LENGTH),
  cardId: z.string().trim().min(1).max(PRINTING_SCORE_CARD_ID_MAX_LENGTH),
});

export type PrintingScoreFormValues = z.infer<typeof printingScoreSchema>;
