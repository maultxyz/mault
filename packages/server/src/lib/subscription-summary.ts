import {
  SUBSCRIPTION_SUMMARY_PLAN_KEYS,
  type AdminSubscriptionSummaryResponse,
  type MonthlyRecurringRevenue,
  type SubscriptionSummaryPlanKey,
} from "@magic-vault/shared";
import { inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { orgBilling } from "../db/schema";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  MONTHS_PER_PRICE_INTERVAL,
  TRIALING_SUBSCRIPTION_STATUS,
} from "./constants/billing";
import type {
  ActiveSubscriptionGroup,
  RecurringPriceInfo,
} from "./interfaces/subscription-summary";
import { getRecurringPriceInfo, isBillingEnabled } from "./stripe";

export function monthlyAmountOfPrice(price: RecurringPriceInfo): number | null {
  const monthsPerInterval = MONTHS_PER_PRICE_INTERVAL[price.interval];
  if (!monthsPerInterval || price.intervalCount <= 0) return null;
  return price.amount / (monthsPerInterval * price.intervalCount);
}

function isSummaryPlanKey(plan: string): plan is SubscriptionSummaryPlanKey {
  return (SUBSCRIPTION_SUMMARY_PLAN_KEYS as readonly string[]).includes(plan);
}

function addRevenue(
  revenueByCurrency: Map<string, number>,
  currency: string,
  amount: number,
) {
  const currencyCode = currency.toUpperCase();
  revenueByCurrency.set(
    currencyCode,
    (revenueByCurrency.get(currencyCode) ?? 0) + amount,
  );
}

function toRevenueList(
  revenueByCurrency: Map<string, number>,
): MonthlyRecurringRevenue[] {
  return [...revenueByCurrency]
    .map(([currency, amount]) => ({
      currency,
      amountInMinorUnits: Math.round(amount),
    }))
    .sort((first, second) => first.currency.localeCompare(second.currency));
}

export function summarizeSubscriptions(
  groups: ActiveSubscriptionGroup[],
  priceById: ReadonlyMap<string, RecurringPriceInfo | null>,
): Omit<AdminSubscriptionSummaryResponse, "billingEnabled"> {
  const tiers = SUBSCRIPTION_SUMMARY_PLAN_KEYS.map((plan) => ({
    plan,
    subscriberCount: 0,
    trialingSubscriberCount: 0,
    revenueByCurrency: new Map<string, number>(),
  }));
  const totalRevenueByCurrency = new Map<string, number>();
  let unpricedSubscriberCount = 0;

  for (const group of groups) {
    if (!isSummaryPlanKey(group.plan)) continue;
    const tier = tiers.find((candidate) => candidate.plan === group.plan);
    if (!tier) continue;
    tier.subscriberCount += group.subscriberCount;
    if (group.status === TRIALING_SUBSCRIPTION_STATUS) {
      tier.trialingSubscriberCount += group.subscriberCount;
      continue;
    }
    const price = group.stripePriceId
      ? priceById.get(group.stripePriceId)
      : null;
    const monthlyAmount = price ? monthlyAmountOfPrice(price) : null;
    if (!price || monthlyAmount == null) {
      unpricedSubscriberCount += group.subscriberCount;
      continue;
    }
    const revenue = monthlyAmount * group.subscriberCount;
    addRevenue(tier.revenueByCurrency, price.currency, revenue);
    addRevenue(totalRevenueByCurrency, price.currency, revenue);
  }

  const visibleTiers = tiers.filter(
    (tier) => tier.plan !== "legacyBusiness" || tier.subscriberCount > 0,
  );
  return {
    tiers: visibleTiers.map(({ revenueByCurrency, ...tier }) => ({
      ...tier,
      monthlyRecurringRevenue: toRevenueList(revenueByCurrency),
    })),
    totalSubscriberCount: visibleTiers.reduce(
      (total, tier) => total + tier.subscriberCount,
      0,
    ),
    totalMonthlyRecurringRevenue: toRevenueList(totalRevenueByCurrency),
    unpricedSubscriberCount,
  };
}

async function loadActiveSubscriptionGroups(): Promise<
  ActiveSubscriptionGroup[]
> {
  return db
    .select({
      plan: orgBilling.plan,
      stripePriceId: orgBilling.stripePriceId,
      status: orgBilling.status,
      subscriberCount: sql<number>`count(*)::int`,
    })
    .from(orgBilling)
    .where(inArray(orgBilling.status, [...ACTIVE_SUBSCRIPTION_STATUSES]))
    .groupBy(orgBilling.plan, orgBilling.stripePriceId, orgBilling.status);
}

async function loadPricesById(
  priceIds: string[],
): Promise<Map<string, RecurringPriceInfo | null>> {
  const prices = await Promise.all(
    priceIds.map((priceId) =>
      getRecurringPriceInfo(priceId).catch((error) => {
        console.error(error);
        return null;
      }),
    ),
  );
  return new Map(priceIds.map((priceId, index) => [priceId, prices[index]]));
}

export async function loadSubscriptionSummary(): Promise<AdminSubscriptionSummaryResponse> {
  if (!isBillingEnabled()) {
    return { billingEnabled: false, ...summarizeSubscriptions([], new Map()) };
  }
  const groups = await loadActiveSubscriptionGroups();
  const priceIds = [
    ...new Set(
      groups
        .filter((group) => group.status !== TRIALING_SUBSCRIPTION_STATUS)
        .map((group) => group.stripePriceId)
        .filter((priceId): priceId is string => !!priceId),
    ),
  ];
  const priceById = await loadPricesById(priceIds);
  return { billingEnabled: true, ...summarizeSubscriptions(groups, priceById) };
}
