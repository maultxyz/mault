import {
  toConditionMultipliers,
  toPriceSource,
  type OrgPricing,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { orgSettings } from "../db/schema";

export async function loadOrgPricing(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<OrgPricing> {
  const row = await runner.query.orgSettings.findFirst({
    where: eq(orgSettings.orgId, orgId),
    columns: { priceSource: true, conditionMultipliers: true },
  });
  return {
    source: toPriceSource(row?.priceSource),
    conditionMultipliers: toConditionMultipliers(row?.conditionMultipliers),
  };
}
