import { formValidationMessage } from "@magic-vault/shared";
import { z } from "zod";
import {
  CONTROL_CARD_TITLE_MAX_LENGTH,
  CONTROL_CARD_TOGGLE_VALUES,
} from "@/lib/constants/control-cards";

export const controlCardSchema = z.object({
  title: z
    .string()
    .trim()
    .max(
      CONTROL_CARD_TITLE_MAX_LENGTH,
      formValidationMessage("nameTooLong", {
        max: CONTROL_CARD_TITLE_MAX_LENGTH,
      }),
    ),
  collectionGuid: z.string(),
  presetGuid: z.string(),
  forcedFoilType: z.string(),
  forcedSetCode: z.string(),
  condition: z.string(),
  autoFeed: z.enum(CONTROL_CARD_TOGGLE_VALUES),
  allowDuplicates: z.enum(CONTROL_CARD_TOGGLE_VALUES),
  pauseScanner: z.boolean(),
});

export type ControlCardFormValues = z.infer<typeof controlCardSchema>;
