import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import { orgBilling } from "../db/schema";
import { FREE_PLAN_MAX_CONNECTED_SORTERS, isBillingEnabled } from "./stripe";

export function sorterLimitForPlan(plan: string | undefined): number {
  if (!isBillingEnabled() || (plan ?? "free") !== "free") {
    return MAX_CONNECTED_SORTERS;
  }
  return Math.min(FREE_PLAN_MAX_CONNECTED_SORTERS, MAX_CONNECTED_SORTERS);
}

export async function getConnectedSorterLimit(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  if (!isBillingEnabled()) return MAX_CONNECTED_SORTERS;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return sorterLimitForPlan(billing?.plan);
}

export function sorterLimitMessage(limit: number): string {
  return limit >= MAX_CONNECTED_SORTERS
    ? `At most ${MAX_CONNECTED_SORTERS} sorters can be connected at a time.`
    : `Your plan allows ${limit} connected sorter(s) at a time. Upgrade to Business to connect more.`;
}
