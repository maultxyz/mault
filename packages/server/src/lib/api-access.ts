import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export function apiAccessAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "apiAccess");
}

export function isApiAccessAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "apiAccess");
}
