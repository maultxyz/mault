import assert from "node:assert/strict";
import { test } from "node:test";
import {
  monthlyAmountOfPrice,
  summarizeSubscriptions,
} from "../src/lib/subscription-summary";

const monthlyEnthusiast = {
  amount: 999,
  currency: "usd",
  interval: "month",
  intervalCount: 1,
};
const yearlyBusiness = {
  amount: 24_000,
  currency: "usd",
  interval: "year",
  intervalCount: 1,
};

test("monthlyAmountOfPrice spreads longer intervals over months", () => {
  assert.equal(monthlyAmountOfPrice(monthlyEnthusiast), 999);
  assert.equal(monthlyAmountOfPrice(yearlyBusiness), 2000);
  assert.equal(
    monthlyAmountOfPrice({ ...monthlyEnthusiast, intervalCount: 3 }),
    333,
  );
  assert.equal(
    monthlyAmountOfPrice({ ...monthlyEnthusiast, interval: "fortnight" }),
    null,
  );
});

test("summarizeSubscriptions counts subscribers per tier and leaves trials out of revenue", () => {
  const summary = summarizeSubscriptions(
    [
      { plan: "enthusiast", stripePriceId: "price_e", status: "active", subscriberCount: 3 },
      { plan: "enthusiast", stripePriceId: "price_e", status: "trialing", subscriberCount: 2 },
      { plan: "business", stripePriceId: "price_b_year", status: "past_due", subscriberCount: 1 },
      { plan: "business", stripePriceId: "price_missing", status: "active", subscriberCount: 1 },
      { plan: "free", stripePriceId: null, status: "active", subscriberCount: 9 },
    ],
    new Map([
      ["price_e", monthlyEnthusiast],
      ["price_b_year", yearlyBusiness],
      ["price_missing", null],
    ]),
  );

  assert.deepEqual(summary.tiers, [
    {
      plan: "enthusiast",
      subscriberCount: 5,
      trialingSubscriberCount: 2,
      monthlyRecurringRevenue: [{ currency: "USD", amountInMinorUnits: 2997 }],
    },
    {
      plan: "business",
      subscriberCount: 2,
      trialingSubscriberCount: 0,
      monthlyRecurringRevenue: [{ currency: "USD", amountInMinorUnits: 2000 }],
    },
  ]);
  assert.equal(summary.totalSubscriberCount, 7);
  assert.deepEqual(summary.totalMonthlyRecurringRevenue, [
    { currency: "USD", amountInMinorUnits: 4997 },
  ]);
  assert.equal(summary.unpricedSubscriberCount, 1);
});

test("summarizeSubscriptions shows legacy Business only when it has subscribers and keeps currencies apart", () => {
  const summary = summarizeSubscriptions(
    [
      { plan: "legacyBusiness", stripePriceId: "price_eur", status: "active", subscriberCount: 1 },
      { plan: "business", stripePriceId: "price_usd", status: "active", subscriberCount: 1 },
    ],
    new Map([
      ["price_eur", { ...monthlyEnthusiast, currency: "eur", amount: 500 }],
      ["price_usd", monthlyEnthusiast],
    ]),
  );

  assert.deepEqual(
    summary.tiers.map((tier) => tier.plan),
    ["enthusiast", "business", "legacyBusiness"],
  );
  assert.deepEqual(summary.totalMonthlyRecurringRevenue, [
    { currency: "EUR", amountInMinorUnits: 500 },
    { currency: "USD", amountInMinorUnits: 999 },
  ]);
  assert.deepEqual(
    summarizeSubscriptions([], new Map()).tiers.map((tier) => tier.plan),
    ["enthusiast", "business"],
  );
});
