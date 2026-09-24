import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { orgBilling } from "../db/schema";
import { FREE_PLAN_MAX_CONNECTED_SORTERS, isBillingEnabled } from "./stripe";

export function sorterLimitForPlan(plan: string | undefined): number | null {
  if (!isBillingEnabled()) return null;
  return (plan ?? "free") === "free" ? FREE_PLAN_MAX_CONNECTED_SORTERS : null;
}

// How many sorters this org may have connected at once; null when unlimited
// (paid plan, or billing isn't configured at all, e.g. self-hosted).
export async function getConnectedSorterLimit(
  tx: Transaction,
  orgId: string,
): Promise<number | null> {
  if (!isBillingEnabled()) return null;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return sorterLimitForPlan(billing?.plan);
}
