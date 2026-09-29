import { eq } from "drizzle-orm";
import type { Transaction } from "../../db";
import { orgBilling } from "../../db/schema";
import { isBillingEnabled } from "../../lib/stripe";

export async function loadOrgPlan(
  tx: Transaction,
  orgId: string,
): Promise<string | undefined> {
  if (!isBillingEnabled()) return undefined;
  const billing = await tx.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { plan: true },
  });
  return billing?.plan ?? "free";
}
