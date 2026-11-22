import type { SetPricesTab } from "@/lib/interfaces/business";
import type { BusinessAccess, CardSellRule, SellPriceMode } from "@magic-vault/shared";

export function setPricesTabsFor(access: BusinessAccess | null): SetPricesTab[] {
  if (!access || access.isLocked) return [];
  const tabs: SetPricesTab[] = [];
  if (access.canManageSettings) tabs.push("sell");
  if (access.canViewCosts) tabs.push("cost");
  return tabs;
}

export function sellRuleKindOf(rule: CardSellRule, currency: string): SellPriceMode {
  if (rule.fixedPrice != null && rule.fixedCurrency === currency) return "fixed";
  if (rule.markupPercent != null) return "markup";
  return "default";
}

export function formatSignedPercent(percent: number): string {
  return `${percent > 0 ? "+" : ""}${percent}%`;
}
