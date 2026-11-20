import type { PlanKey } from "@magic-vault/shared";
import type Stripe from "stripe";
import { hasActiveSubscription } from "./billing-status";
import { PLAN_RANK } from "./constants/billing";

export function chooseOrgSubscription(
  subscriptions: Stripe.Subscription[],
): Stripe.Subscription | null {
  const newestFirst = [...subscriptions].sort((a, b) => b.created - a.created);
  return (
    newestFirst.find((subscription) =>
      hasActiveSubscription(subscription.status),
    ) ??
    newestFirst[0] ??
    null
  );
}

export function chooseHighestPlanItem(
  items: Stripe.SubscriptionItem[],
  planForPriceId: (priceId: string) => PlanKey | null,
): { item: Stripe.SubscriptionItem; plan: PlanKey } | null {
  let chosen: { item: Stripe.SubscriptionItem; plan: PlanKey } | null = null;
  for (const item of items) {
    const plan = planForPriceId(item.price.id);
    if (plan && (!chosen || PLAN_RANK[plan] > PLAN_RANK[chosen.plan])) {
      chosen = { item, plan };
    }
  }
  return chosen;
}
