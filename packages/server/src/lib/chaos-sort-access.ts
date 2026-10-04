import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { orgBilling } from "../db/schema";
import { isBillingEnabled } from "./stripe";

export const CHAOS_SORT_UPGRADE_MESSAGE =
  "Chaos sort is part of the Business plan. Upgrade to Business to use it.";

export function chaosSortAllowedForPlan(plan: string | undefined): boolean {
  return !isBillingEnabled() || plan === "business";
}

export async function isChaosSortAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  if (!isBillingEnabled()) return true;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return chaosSortAllowedForPlan(billing?.plan);
}
