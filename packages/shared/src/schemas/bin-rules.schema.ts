import { z } from "zod";
import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  CONDITION_VALUE_NUMERIC_MAX,
  LOW_MATCH_PERCENT_MAX,
  OVERRIDE_PRIORITY_MAX,
} from "../constants/sort-bins.constant";
import type { BinRuleGroup } from "../interfaces/sort-bins.interface";

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
    z.number().max(CONDITION_VALUE_NUMERIC_MAX),
    z.array(z.string().max(CONDITION_STRING_MAX_LENGTH)),
  ]),
});

export const binRuleGroupSchema: z.ZodType<BinRuleGroup, BinRuleGroup> = z.object({
  id: z.string(),
  combinator: z.enum(["and", "or"]),
  conditions: z.array(z.union([binConditionSchema, z.lazy(() => binRuleGroupSchema)])),
});

const exportedBinSchema = z.object({
  binNumber: z.number().int().positive(),
  rules: binRuleGroupSchema,
  isCatchAll: z.boolean(),
  isOverride: z.boolean().default(false),
  overridePriority: z.number().int().min(1).max(OVERRIDE_PRIORITY_MAX).nullable().default(null),
  lowMatchPercent: z.number().positive().max(LOW_MATCH_PERCENT_MAX).nullable().default(null),
  maxCopies: z.number().int().min(1).max(CONDITION_NUMERIC_MAX).nullable().default(null),
  maxCopiesBy: z.string().trim().min(1).nullable().default(null),
  maxCards: z.number().int().min(1).max(CONDITION_NUMERIC_MAX).nullable().default(null),
  overflowBin: z.number().int().positive().nullable().default(null),
  isDisabled: z.boolean().default(false),
});

export const binRulesExportSchema = z.object({
  formatVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  name: z.string().trim().min(1),
  gameKey: z.string().nullable(),
  bins: z.array(exportedBinSchema),
});

export type BinRulesExport = z.infer<typeof binRulesExportSchema>;
