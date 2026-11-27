import { z } from "zod";
import {
  CONDITION_NUMERIC_MAX,
  formValidationMessage,
  LOW_MATCH_PERCENT_MAX,
  OVERRIDE_PRIORITY_MAX,
  type BinRuleGroup,
} from "@magic-vault/shared";

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
  isOverride: z.boolean(),
  overridePriority: z
    .number()
    .int(formValidationMessage("wholeNumber"))
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(OVERRIDE_PRIORITY_MAX, formValidationMessage("atMost", { max: OVERRIDE_PRIORITY_MAX }))
    .nullable(),
  lowMatchPercent: z
    .number()
    .min(1, formValidationMessage("percentAtLeast", { min: 1 }))
    .max(LOW_MATCH_PERCENT_MAX, formValidationMessage("percentAtMost", { max: LOW_MATCH_PERCENT_MAX }))
    .nullable(),
  maxCopies: z
    .number()
    .int(formValidationMessage("wholeNumber"))
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(CONDITION_NUMERIC_MAX, formValidationMessage("atMost", { max: CONDITION_NUMERIC_MAX }))
    .nullable(),
  maxCopiesBy: z.string(),
});
