import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { orgBilling } from "../db/schema";
import { FREE_PLAN_MAX_SOUND_RULES, isBillingEnabled } from "./stripe";

export function soundRuleLimitForPlan(plan: string | undefined): number | null {
  if (!isBillingEnabled() || (plan ?? "free") !== "free") return null;
  return FREE_PLAN_MAX_SOUND_RULES;
}

export async function getSoundRuleLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  if (!isBillingEnabled()) return null;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return soundRuleLimitForPlan(billing?.plan);
}

export function soundRuleLimitMessage(limit: number): string {
  return `Your plan allows ${limit} sound rule${limit === 1 ? "" : "s"}. Upgrade to Business for unlimited sound rules.`;
}
