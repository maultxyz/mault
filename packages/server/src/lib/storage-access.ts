import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const STORAGE_UPGRADE_MESSAGE =
  "Storage locations are not part of your plan. Upgrade your plan to use them.";

export function storageAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "storage");
}

export function isStorageAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "storage");
}
