import { z } from "zod";
import type { BinRuleGroup } from "@magic-vault/shared";

export const binSchema = z.object({
  rules: z.custom<BinRuleGroup>((value) => !!value && typeof value === "object" && "conditions" in value),
  isCatchAll: z.boolean(),
  isDisabled: z.boolean(),
  overflowBin: z.number().int().nullable(),
});
