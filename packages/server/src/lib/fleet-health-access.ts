import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const FLEET_HEALTH_LOCKED_RESULT = {
  success: false,
  message:
    "Fleet health is not part of your plan. Upgrade your plan to use it.",
  upgradeRequired: true,
} as const;

export function fleetHealthAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "fleetHealth");
}

export function isFleetHealthAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "fleetHealth");
}
