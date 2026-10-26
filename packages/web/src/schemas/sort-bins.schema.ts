import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  formValidationMessage,
  LOW_MATCH_PERCENT_MAX,
  OVERRIDE_PRIORITY_MAX,
  SET_NAME_MAX_LENGTH,
  type BinRuleGroup,
} from "@magic-vault/shared";
import { z } from "zod";
import { PICK_LIST_DECKLIST_MAX_LENGTH } from "@/lib/constants/bins";

export const createSetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, formValidationMessage("nameRequired"))
    .max(
      SET_NAME_MAX_LENGTH,
      formValidationMessage("nameTooLong", { max: SET_NAME_MAX_LENGTH }),
    ),
});

export type CreateSetFormValues = z.infer<typeof createSetSchema>;

const conditionOperatorValues = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
  "count_equals",
  "count_gt",
  "count_lt",
  "is_null",
  "is_not_null",
] as const;

export const binConditionSchema = z.object({
  id: z.string(),
  field: z.string().min(1),
  operator: z.enum(conditionOperatorValues),
  value: z.union([
    z.string().max(CONDITION_STRING_MAX_LENGTH),
    z.number().max(CONDITION_NUMERIC_MAX),
    z.array(z.string().max(CONDITION_STRING_MAX_LENGTH)),
  ]),
});

export const binRuleGroupSchema: z.ZodType<BinRuleGroup, BinRuleGroup> =
  z.object({
    id: z.string(),
    combinator: z.enum(["and", "or"]),
    conditions: z.array(
      z.union([binConditionSchema, z.lazy(() => binRuleGroupSchema)]),
    ),
  });

export const binConfigSchema = z.object({
  isCatchAll: z.boolean(),
  isOverride: z.boolean(),
  overridePriority: z
    .number()
    .int(formValidationMessage("wholeNumber"))
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(OVERRIDE_PRIORITY_MAX, formValidationMessage("atMost", { max: OVERRIDE_PRIORITY_MAX }))
    .nullable(),
  repackPriority: z.number().int().min(1).nullable(),
  isDisabled: z.boolean(),
  rules: binRuleGroupSchema,
  maxCopies: z
    .number()
    .int()
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(CONDITION_NUMERIC_MAX)
    .nullable(),
  maxCopiesBy: z.string(),
  overflowBin: z.number().int().positive().nullable(),
  lowMatchPercent: z
    .number()
    .min(1, formValidationMessage("percentAtLeast", { min: 1 }))
    .max(LOW_MATCH_PERCENT_MAX, formValidationMessage("percentAtMost", { max: LOW_MATCH_PERCENT_MAX }))
    .nullable(),
  pickList: z
    .object({
      mode: z.enum(["until_found", "all"]),
      decklist: z.string().max(PICK_LIST_DECKLIST_MAX_LENGTH),
    })
    .nullable(),
});

export type BinConfigFormValues = z.infer<typeof binConfigSchema>;

export const repackSlotSchema = z.object({
  id: z.string(),
  rule: binRuleGroupSchema,
  targetCount: z
    .number()
    .int()
    .min(1, formValidationMessage("atLeast", { min: 1 }))
    .max(CONDITION_NUMERIC_MAX),
});

export const repackConfigSchema = z.object({
  repackUniqueBy: z.string().min(1),
  repackSiftRules: binRuleGroupSchema.nullable(),
  repackSlots: z.array(repackSlotSchema),
  repackMultiplePacks: z.boolean(),
});

export type RepackConfigFormValues = z.infer<typeof repackConfigSchema>;

