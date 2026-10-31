import {
  BILLING_INTERVALS,
  LEGACY_BUSINESS_PLAN,
  LEGACY_BUSINESS_REPORTED_PLAN,
  PAID_PLAN_KEYS,
  type PlanKey,
  type BillingInterval,
  type PaidPlanKey,
  type PaidPlanPrices,
  type PlanIntervalPrices,
  type PlanPriceInfo,
} from "@magic-vault/shared";
import Stripe from "stripe";
import {
  LEGACY_BUSINESS_PRICE_ID_ENV,
  PLAN_PRICE_ID_ENV,
} from "./constants/billing";
import { isLegacyPricingActive } from "./pricing-mode";
import { STRIPE_PRICE_CACHE_TTL_MS as PRICE_CACHE_TTL_MS } from "./constants/timing";

let _stripe: Stripe | null = null;

export function isBillingEnabled(): boolean {
  return (
    process.env.AUTH_PROVIDER !== "local" && !!process.env.STRIPE_SECRET_KEY
  );
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }
    _stripe = new Stripe(secretKey);
  }
  return _stripe;
}

function findLegacyBusinessPriceId(
  interval: BillingInterval,
): string | undefined {
  return (
    process.env[LEGACY_BUSINESS_PRICE_ID_ENV[interval]] ||
    process.env[PLAN_PRICE_ID_ENV.business[interval]] ||
    undefined
  );
}

export function hasSeparateLegacyBusinessPrices(): boolean {
  const legacyMonthly = process.env[LEGACY_BUSINESS_PRICE_ID_ENV.month];
  return (
    !!legacyMonthly &&
    legacyMonthly !== process.env[PLAN_PRICE_ID_ENV.business.month]
  );
}

export function findPlanPriceId(
  plan: PaidPlanKey,
  interval: BillingInterval,
): string | undefined {
  if (isLegacyPricingActive()) {
    return plan === LEGACY_BUSINESS_REPORTED_PLAN
      ? findLegacyBusinessPriceId(interval)
      : undefined;
  }
  return process.env[PLAN_PRICE_ID_ENV[plan][interval]] || undefined;
}

export function findPlanForPriceId(
  priceId: string | null | undefined,
): { plan: PlanKey; interval: BillingInterval } | null {
  if (!priceId) return null;
  const legacyInterval = BILLING_INTERVALS.find(
    (interval) => findLegacyBusinessPriceId(interval) === priceId,
  );
  if (legacyInterval) {
    return { plan: LEGACY_BUSINESS_PLAN, interval: legacyInterval };
  }
  for (const plan of PAID_PLAN_KEYS) {
    for (const interval of BILLING_INTERVALS) {
      if (findPlanPriceId(plan, interval) === priceId) {
        return { plan, interval };
      }
    }
  }
  return null;
}

export const FREE_PLAN_DAILY_SCAN_LIMIT =
  Number(process.env.FREE_PLAN_DAILY_SCAN_LIMIT) || 50;
export const FREE_PLAN_MAX_CONNECTED_SORTERS =
  Number(process.env.FREE_PLAN_MAX_CONNECTED_SORTERS) || 1;

let _portalConfiguration: {
  id: string;
  isLegacyPricing: boolean;
} | null = null;

async function listPaidPlanPortalProducts(): Promise<
  { product: string; prices: string[] }[]
> {
  const priceIds = PAID_PLAN_KEYS.flatMap((plan) =>
    BILLING_INTERVALS.map((interval) => findPlanPriceId(plan, interval)),
  ).filter((priceId): priceId is string => !!priceId);
  const prices = await Promise.all(
    priceIds.map((priceId) => getStripe().prices.retrieve(priceId)),
  );
  const pricesByProduct = new Map<string, string[]>();
  for (const price of prices) {
    const product =
      typeof price.product === "string" ? price.product : price.product.id;
    pricesByProduct.set(product, [
      ...(pricesByProduct.get(product) ?? []),
      price.id,
    ]);
  }
  return [...pricesByProduct].map(([product, productPrices]) => ({
    product,
    prices: productPrices,
  }));
}

export async function getBillingPortalConfigurationId(): Promise<
  string | undefined
> {
  const isLegacyPricing = isLegacyPricingActive();
  if (_portalConfiguration?.isLegacyPricing === isLegacyPricing) {
    return _portalConfiguration.id;
  }

  const stripe = getStripe();
  const { data } = await stripe.billingPortal.configurations.list({
    is_default: true,
    limit: 1,
  });
  const config = data[0];
  if (!config) return undefined;

  const products = await listPaidPlanPortalProducts();
  const priceCount = products.reduce(
    (total, product) => total + product.prices.length,
    0,
  );
  await stripe.billingPortal.configurations.update(config.id, {
    features: {
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      ...(priceCount > 1 && {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products,
        },
      }),
    },
  });

  _portalConfiguration = { id: config.id, isLegacyPricing };
  return config.id;
}

const _planPriceCache = new Map<
  string,
  { info: PlanPriceInfo | null; cachedAt: number }
>();

async function getPlanPriceInfo(
  plan: PaidPlanKey,
  interval: BillingInterval,
): Promise<PlanPriceInfo | null> {
  const priceId = findPlanPriceId(plan, interval);
  if (!priceId) return null;

  const cached = _planPriceCache.get(priceId);
  if (cached && Date.now() - cached.cachedAt < PRICE_CACHE_TTL_MS) {
    return cached.info;
  }

  const price = await getStripe().prices.retrieve(priceId);
  const info =
    price.unit_amount == null || !price.recurring
      ? null
      : {
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring.interval,
        };
  _planPriceCache.set(priceId, { info, cachedAt: Date.now() });
  return info;
}

async function getPlanIntervalPrices(
  plan: PaidPlanKey,
): Promise<PlanIntervalPrices> {
  const [month, year] = await Promise.all(
    BILLING_INTERVALS.map((interval) =>
      getPlanPriceInfo(plan, interval).catch((err) => {
        console.error(err);
        return null;
      }),
    ),
  );
  return { month, year };
}

export async function getPaidPlanPrices(): Promise<PaidPlanPrices> {
  const [enthusiast, business] = await Promise.all(
    PAID_PLAN_KEYS.map(getPlanIntervalPrices),
  );
  return { enthusiast, business };
}
export const FREE_PLAN_MAX_SOUND_RULES =
  Number(process.env.FREE_PLAN_MAX_SOUND_RULES) || 1;
export const FREE_PLAN_MAX_NOTIFICATION_RULES =
  Number(process.env.FREE_PLAN_MAX_NOTIFICATION_RULES) || 1;
