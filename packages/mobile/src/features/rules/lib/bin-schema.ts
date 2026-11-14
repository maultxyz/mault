import { z } from "zod";
import { CONDITION_NUMERIC_MAX, formValidationMessage, type BinRuleGroup } from "@magic-vault/shared";

export const binSchema = z.object({
  rules: z.custom<BinRuleGroup>((value) => !!value && typeof value === "object" && "conditions" in value),
  isCatchAll: z.boolean(),
  isDisabled: z.boolean(),
  overflowBin: z.number().int().nullable(),
  maxCards: z
    .number()
    .int(formValidationMessage("wholeNumber"))
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(CONDITION_NUMERIC_MAX, formValidationMessage("atMost", { max: CONDITION_NUMERIC_MAX }))
    .nullable(),
});
