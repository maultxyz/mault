import { eq } from "drizzle-orm";
import type { Transaction } from "../db";
import {
  binHeightAudit,
  binHeights,
  binRouteAudit,
  binRoutes,
  binSetAudit,
  binSets,
  bins,
  collectionCards,
  collections,
  devices,
  feederConfigAudit,
  feederConfigs,
  moduleConfigAudit,
  moduleConfigs,
  orgBilling,
  orgSettings,
  unmatchedCards,
} from "../db/schema";
const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
]);

export class ActiveSubscriptionError extends Error {
  constructor() {
    super(
      "Cancel this organization's subscription in Billing before deleting it.",
    );
  }
}

// A subscription already set to cancel at period end is let through: Stripe
// won't charge it again, and its final cancellation webhook is ignored for an
// org whose billing row is gone (routes/public/webhook-stripe.ts).
async function assertNoActiveSubscription(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  const [billing] = await tx
    .select({
      subscriptionId: orgBilling.stripeSubscriptionId,
      status: orgBilling.status,
      cancelAtPeriodEnd: orgBilling.cancelAtPeriodEnd,
    })
    .from(orgBilling)
    .where(eq(orgBilling.orgId, orgId))
    .limit(1);
  if (
    billing?.subscriptionId &&
    !billing.cancelAtPeriodEnd &&
    !INACTIVE_SUBSCRIPTION_STATUSES.has(billing.status ?? "")
  ) {
    throw new ActiveSubscriptionError();
  }
}

export async function purgeOrgData(
  tx: Transaction,
  orgId: string,
): Promise<void> {
  await assertNoActiveSubscription(tx, orgId);

  await tx.delete(collectionCards).where(eq(collectionCards.orgId, orgId));
  await tx.delete(unmatchedCards).where(eq(unmatchedCards.orgId, orgId));
  await tx.delete(collections).where(eq(collections.orgId, orgId));

  await tx.delete(bins).where(eq(bins.orgId, orgId));
  await tx.delete(binSets).where(eq(binSets.orgId, orgId));

  await tx.delete(binRoutes).where(eq(binRoutes.orgId, orgId));
  await tx.delete(binHeights).where(eq(binHeights.orgId, orgId));
  await tx.delete(moduleConfigs).where(eq(moduleConfigs.orgId, orgId));
  await tx.delete(feederConfigs).where(eq(feederConfigs.orgId, orgId));
  await tx.delete(devices).where(eq(devices.orgId, orgId));

  await tx.delete(binSetAudit).where(eq(binSetAudit.orgId, orgId));
  await tx.delete(binRouteAudit).where(eq(binRouteAudit.orgId, orgId));
  await tx.delete(binHeightAudit).where(eq(binHeightAudit.orgId, orgId));
  await tx.delete(moduleConfigAudit).where(eq(moduleConfigAudit.orgId, orgId));
  await tx.delete(feederConfigAudit).where(eq(feederConfigAudit.orgId, orgId));

  await tx.delete(orgSettings).where(eq(orgSettings.orgId, orgId));
  await tx.delete(orgBilling).where(eq(orgBilling.orgId, orgId));
}
