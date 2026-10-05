import type { Transaction } from "../db";
import { loadPlanForOrg, planLimit } from "./plan-config";

export function notificationRuleLimitForPlan(
  plan: string | undefined,
): number | null {
  return planLimit(plan, "notificationRules");
}

export async function getNotificationRuleLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  return notificationRuleLimitForPlan(await loadPlanForOrg(tx, orgId));
}

export function notificationRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} Discord notification rule${limit === 1 ? "" : "s"}. Upgrade to Business for unlimited notification rules.`;
}
