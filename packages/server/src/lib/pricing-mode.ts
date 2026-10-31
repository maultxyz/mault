import { eq } from "drizzle-orm";
import { db } from "../db";
import { platformBillingSettings } from "../db/schema";
import { PLATFORM_BILLING_SETTINGS_ID } from "./constants/billing";

let legacyPricingActive = true;

export function isLegacyPricingActive(): boolean {
  return legacyPricingActive;
}

export async function refreshPricingMode(): Promise<boolean> {
  const row = await db.query.platformBillingSettings.findFirst({
    where: eq(platformBillingSettings.id, PLATFORM_BILLING_SETTINGS_ID),
    columns: { isLegacyPricingActive: true },
  });
  legacyPricingActive = row?.isLegacyPricingActive ?? true;
  return legacyPricingActive;
}

export async function saveLegacyPricingActive(
  isActive: boolean,
): Promise<boolean> {
  const values = {
    id: PLATFORM_BILLING_SETTINGS_ID,
    isLegacyPricingActive: isActive,
    updatedAt: new Date(),
  };
  await db
    .insert(platformBillingSettings)
    .values(values)
    .onConflictDoUpdate({ target: platformBillingSettings.id, set: values });
  return refreshPricingMode();
}
