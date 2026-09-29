import { toPriceSource, type PriceSource } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import type { db, Transaction } from "../db";
import { orgSettings } from "../db/schema";

export async function loadOrgPriceSource(
  runner: Transaction | typeof db,
  orgId: string,
): Promise<PriceSource> {
  const row = await runner.query.orgSettings.findFirst({
    where: eq(orgSettings.orgId, orgId),
    columns: { priceSource: true },
  });
  return toPriceSource(row?.priceSource);
}
