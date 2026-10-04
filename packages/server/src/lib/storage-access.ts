import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const STORAGE_UPGRADE_MESSAGE =
  "Storage locations are part of the Business plan. Upgrade to Business to use them.";

export function storageAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "storage");
}

export function isStorageAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "storage");
}
