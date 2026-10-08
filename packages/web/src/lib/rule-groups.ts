import type { BinRuleGroup } from "@magic-vault/shared";

export function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}
