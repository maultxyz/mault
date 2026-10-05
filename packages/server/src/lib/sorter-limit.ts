import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import type { Transaction } from "../db";
import { connectedSorterLimitForPlan, loadPlanForOrg } from "./plan-config";

export function sorterLimitForPlan(plan: string | undefined): number {
  return connectedSorterLimitForPlan(plan);
}

export async function getConnectedSorterLimit(
  tx: Transaction,
  orgId: string,
): Promise<number> {
  return sorterLimitForPlan(await loadPlanForOrg(tx, orgId));
}

export function sorterLimitMessage(limit: number): string {
  return limit >= MAX_CONNECTED_SORTERS
    ? `At most ${MAX_CONNECTED_SORTERS} sorters can be connected at a time.`
    : `Your plan allows ${limit} connected sorter(s) at a time. Upgrade to Business to connect more.`;
}
