import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const CHAOS_SORT_UPGRADE_MESSAGE =
  "Chaos sort is part of the Business plan. Upgrade to Business to use it.";

export function chaosSortAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "chaosSort");
}

export function isChaosSortAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "chaosSort");
}
