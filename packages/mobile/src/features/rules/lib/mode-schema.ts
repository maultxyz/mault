import { z } from "zod";
import type { BinRuleGroup, RepackSlot } from "@magic-vault/shared";

const ruleGroup = z.custom<BinRuleGroup>((value) => !!value && typeof value === "object" && "conditions" in value);

export const modeSchema = z
  .object({
    mode: z.enum(["rules", "scan-only", "auto-assign", "repack", "alphabet", "chaos"]),
    autoAssignField: z.string().nullable(),
    scanOnlyMatchedBin: z.number().int(),
    scanOnlyUnmatchedBin: z.number().int(),
    chaosBinSize: z.string().regex(/^\d*$/),
    skipSaving: z.boolean(),
  })
  .refine((values) => values.mode !== "auto-assign" || !!values.autoAssignField, { path: ["autoAssignField"] });

export const repackSchema = z.object({
  repackUniqueBy: z.string(),
  repackSiftRules: ruleGroup.nullable(),
  repackSlots: z.array(
    z.custom<RepackSlot>((value) => !!value && typeof value === "object" && "rule" in value && "targetCount" in value),
  ),
});
