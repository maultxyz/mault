import type { BinRuleGroup } from "@magic-vault/shared";
import { z } from "zod";

export function nonEmptyRuleGroupSchema(message: string) {
  return z.custom<BinRuleGroup>(
    (value) =>
      !!value &&
      typeof value === "object" &&
      Array.isArray((value as BinRuleGroup).conditions) &&
      (value as BinRuleGroup).conditions.length > 0,
    message,
  );
}
