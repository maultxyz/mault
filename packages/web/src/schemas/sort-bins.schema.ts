import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  LOW_MATCH_PERCENT_MAX,
  OVERRIDE_PRIORITY_MAX,
  SET_NAME_MAX_LENGTH,
  type BinRuleGroup,
} from "@magic-vault/shared";
import { z } from "zod";

export const createSetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(
      SET_NAME_MAX_LENGTH,
      `Name must be ${SET_NAME_MAX_LENGTH} characters or less`,
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
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(OVERRIDE_PRIORITY_MAX, `Must be at most ${OVERRIDE_PRIORITY_MAX}`)
    .nullable(),
  isDisabled: z.boolean(),
  rules: binRuleGroupSchema,
  maxCopies: z
    .number()
    .int()
    .min(1, "Must allow at least 1 copy")
    .max(CONDITION_NUMERIC_MAX)
    .nullable(),
  maxCopiesBy: z.string(),
  lowMatchPercent: z
    .number()
    .min(1, "Must be at least 1%")
    .max(LOW_MATCH_PERCENT_MAX, `Must be at most ${LOW_MATCH_PERCENT_MAX}%`)
    .nullable(),
});

export type BinConfigFormValues = z.infer<typeof binConfigSchema>;

export const repackSlotSchema = z.object({
  id: z.string(),
  rule: binRuleGroupSchema,
  targetCount: z
    .number()
    .int()
    .min(1, "Must be at least 1 card")
    .max(CONDITION_NUMERIC_MAX),
});

export type RepackSlotFormValues = z.infer<typeof repackSlotSchema>;

export const repackConfigSchema = z.object({
  repackUniqueBy: z.string().min(1),
  repackSiftRules: binRuleGroupSchema.nullable(),
  repackSlots: z.array(repackSlotSchema),
});

export type RepackConfigFormValues = z.infer<typeof repackConfigSchema>;
