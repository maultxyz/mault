import type { Transaction } from "../db";
import { orgHasFeature, planHasFeature } from "./plan-config";

export const CUSTOM_SOUNDS_UPGRADE_MESSAGE =
  "Custom sounds are not part of your plan. Upgrade your plan to upload your own clips.";

export function customSoundsAllowedForPlan(plan: string | undefined): boolean {
  return planHasFeature(plan, "customSounds");
}

export function isCustomSoundsAllowed(
  tx: Transaction,
  orgId: string,
): Promise<boolean> {
  return orgHasFeature(tx, orgId, "customSounds");
}
