import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const REPACK_UPGRADE_MESSAGE =
  "Building repacks is not part of your plan. Upgrade your plan to use it.";

export function repacksAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "repacks");
}

export function isRepackAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "repacks");
}
