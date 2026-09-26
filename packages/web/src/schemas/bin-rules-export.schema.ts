import { binRuleGroupSchema } from "@/schemas/sort-bins.schema";
import { CONDITION_NUMERIC_MAX } from "@magic-vault/shared";
import { z } from "zod";

const exportedBinSchema = z.object({
  binNumber: z.number().int().positive(),
  rules: binRuleGroupSchema,
  isCatchAll: z.boolean(),
  isOverride: z.boolean().default(false),
  cardLimit: z.number().int().min(1).max(CONDITION_NUMERIC_MAX).nullable(),
});

export const binRulesExportSchema = z.object({
  formatVersion: z.literal(1),
  name: z.string().trim().min(1),
  gameKey: z.string().nullable(),
  bins: z.array(exportedBinSchema),
});

export type BinRulesExport = z.infer<typeof binRulesExportSchema>;
