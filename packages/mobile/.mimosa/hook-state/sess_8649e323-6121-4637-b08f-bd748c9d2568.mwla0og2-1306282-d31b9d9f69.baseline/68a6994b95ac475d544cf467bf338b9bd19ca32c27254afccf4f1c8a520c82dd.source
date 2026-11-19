import { z } from "zod";
import { CONDITION_NUMERIC_MAX, formValidationMessage, type BinRuleGroup } from "@magic-vault/shared";

const ruleGroup = z.custom<BinRuleGroup>((value) => !!value && typeof value === "object" && "conditions" in value);

export const modeSchema = z
  .object({
    mode: z.enum(["rules", "scan-only", "auto-assign", "game-sort", "repack", "alphabet", "chaos"]),
    autoAssignField: z.string().nullable(),
    matchGameKeys: z.array(z.string()),
    scanOnlyMatchedBin: z.number().int(),
    scanOnlyUnmatchedBin: z.number().int(),
    chaosBinSize: z.string().regex(/^\d*$/),
    skipSaving: z.boolean(),
    isResortMode: z.boolean(),
  })
  .refine((values) => values.mode !== "auto-assign" || !!values.autoAssignField, { path: ["autoAssignField"] });

export const repackSchema = z.object({
  repackUniqueBy: z.string(),
  repackSiftRules: ruleGroup.nullable(),
  repackSlots: z.array(
    z.object({
      id: z.string(),
      rule: ruleGroup,
      targetCount: z
        .number()
        .int(formValidationMessage("wholeNumber"))
        .min(1, formValidationMessage("atLeast", { min: 1 }))
        .max(CONDITION_NUMERIC_MAX, formValidationMessage("atMost", { max: CONDITION_NUMERIC_MAX }))
        .nullable()
        .refine((targetCount) => targetCount != null, formValidationMessage("valueRequired")),
    }),
  ),
  repackMultiplePacks: z.boolean(),
});
