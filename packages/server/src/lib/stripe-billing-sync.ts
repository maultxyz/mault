import { LEGACY_BUSINESS_PLAN } from "@magic-vault/shared";
import type Stripe from "stripe";
import { db } from "../db";
import { orgBilling } from "../db/schema";
import { invalidateMemberSeats } from "./member-seat-limit";
import { invalidateOrgReadCaches } from "./org-read-cache";
import { findPlanForPriceId, getStripe } from "./stripe";
import {
  chooseHighestPlanItem,
  chooseOrgSubscription,
} from "./stripe-subscription-choice";

async function upsertOrgBillingFromSubscription(
  orgId: string,
  customerId: string,
  subscription: Stripe.Subscription,
) {
  const knownPlanItem = chooseHighestPlanItem(
    subscription.items.data,
    (priceId) => findPlanForPriceId(priceId)?.plan ?? null,
  );
  const item = knownPlanItem?.item ?? subscription.items.data[0];
  const plan =
    subscription.status === "canceled"
      ? "free"
      : (knownPlanItem?.plan ?? LEGACY_BUSINESS_PLAN);
  const billingFields = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price.id ?? null,
    plan,
    status: subscription.status,
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end || subscription.cancel_at != null,
  };
  await db
    .insert(orgBilling)
    .values({ orgId, ...billingFields })
    .onConflictDoUpdate({
      target: [orgBilling.orgId],
      set: { ...billingFields, updatedAt: new Date() },
    });
}

export async function syncOrgBillingFromStripe(
  orgId: string,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const { data: subscriptions } = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  const subscription = chooseOrgSubscription(subscriptions);
  if (subscription) {
    await upsertOrgBillingFromSubscription(orgId, customerId, subscription);
    invalidateMemberSeats(orgId);
    invalidateOrgReadCaches(orgId);
  }
  return subscription;
}
