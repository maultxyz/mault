import type { Transaction } from "../db";
import { loadPlanForOrg, planLimit } from "./plan-config";

export function soundRuleLimitForPlan(plan: string | undefined): number | null {
  return planLimit(plan, "soundRules");
}

export async function getSoundRuleLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  return soundRuleLimitForPlan(await loadPlanForOrg(tx, orgId));
}

export function soundRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} sound rule${limit === 1 ? "" : "s"}. Upgrade to Business for unlimited sound rules.`;
}
