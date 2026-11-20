import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import {
  chooseHighestPlanItem,
  chooseOrgSubscription,
} from "../src/lib/stripe-subscription-choice";

function subscription(
  id: string,
  status: Stripe.Subscription.Status,
  created: number,
): Stripe.Subscription {
  return { id, status, created } as Stripe.Subscription;
}

test("prefers the newest active subscription over older active ones", () => {
  const chosen = chooseOrgSubscription([
    subscription("enthusiast", "active", 100),
    subscription("business", "active", 200),
  ]);
  assert.equal(chosen?.id, "business");
});

test("an active subscription wins over a newer canceled one", () => {
  const chosen = chooseOrgSubscription([
    subscription("business", "active", 100),
    subscription("enthusiast", "canceled", 200),
  ]);
  assert.equal(chosen?.id, "business");
});

test("falls back to the newest subscription when none is active", () => {
  const chosen = chooseOrgSubscription([
    subscription("old", "canceled", 100),
    subscription("newer", "incomplete_expired", 200),
  ]);
  assert.equal(chosen?.id, "newer");
});

test("returns null without subscriptions", () => {
  assert.equal(chooseOrgSubscription([]), null);
});

function item(priceId: string): Stripe.SubscriptionItem {
  return { price: { id: priceId } } as Stripe.SubscriptionItem;
}

const planForPriceId = (priceId: string) =>
  priceId === "price_enthusiast"
    ? "enthusiast"
    : priceId === "price_business"
      ? "business"
      : null;

test("a subscription holding Enthusiast and Business items is Business", () => {
  const chosen = chooseHighestPlanItem(
    [item("price_enthusiast"), item("price_business")],
    planForPriceId,
  );
  assert.equal(chosen?.plan, "business");
  assert.equal(chosen?.item.price.id, "price_business");
});

test("items with unknown prices are skipped", () => {
  const chosen = chooseHighestPlanItem(
    [item("price_addon"), item("price_enthusiast")],
    planForPriceId,
  );
  assert.equal(chosen?.plan, "enthusiast");
  assert.equal(chooseHighestPlanItem([item("price_addon")], planForPriceId), null);
});
