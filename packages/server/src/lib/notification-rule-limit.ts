import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { orgBilling } from "../db/schema";
import { FREE_PLAN_MAX_NOTIFICATION_RULES, isBillingEnabled } from "./stripe";

export function notificationRuleLimitForPlan(
  plan: string | undefined,
): number | null {
  if (!isBillingEnabled() || (plan ?? "free") !== "free") return null;
  return FREE_PLAN_MAX_NOTIFICATION_RULES;
}

export async function getNotificationRuleLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  if (!isBillingEnabled()) return null;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return notificationRuleLimitForPlan(billing?.plan);
}

export function notificationRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} Discord notification rule${limit === 1 ? "" : "s"}. Upgrade to Business for unlimited notification rules.`;
}
