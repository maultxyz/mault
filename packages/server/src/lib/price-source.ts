import {
  toConditionMultipliers,
  toPriceSource,
  type OrgPricing,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { orgSettings } from "../db/schema";
import {
  ORG_PRICING_CACHE_TTL_MS,
  ORG_PRICING_CACHE_VARIANT_KEY,
  ORG_SETTINGS_READ_CACHE_MAX_ENTRIES,
} from "./constants/org-settings-read-cache";
import { createOrgReadCache } from "./org-read-cache";

const orgPricingCache = createOrgReadCache<OrgPricing>(
  ORG_PRICING_CACHE_TTL_MS,
  ORG_SETTINGS_READ_CACHE_MAX_ENTRIES,
);

export function loadOrgPricing(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<OrgPricing> {
  return orgPricingCache.get(orgId, ORG_PRICING_CACHE_VARIANT_KEY, async () => {
    const row = await runner.query.orgSettings.findFirst({
      where: eq(orgSettings.orgId, orgId),
      columns: { priceSource: true, conditionMultipliers: true },
    });
    return {
      source: toPriceSource(row?.priceSource),
      conditionMultipliers: toConditionMultipliers(row?.conditionMultipliers),
    };
  });
}
