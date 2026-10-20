import {
  BILLING_INTERVALS,
  type BillingInterval,
  type BusinessPriceInfo,
  type BusinessPrices,
} from "@magic-vault/shared";
import Stripe from "stripe";
import { BUSINESS_PRICE_ID_ENV } from "./constants/billing";
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

export function findBusinessPriceId(
  interval: BillingInterval,
): string | undefined {
  return process.env[BUSINESS_PRICE_ID_ENV[interval]] || undefined;
}

export function businessIntervalForPriceId(
  priceId: string | null | undefined,
): BillingInterval | null {
  if (!priceId) return null;
  return (
    BILLING_INTERVALS.find(
      (interval) => findBusinessPriceId(interval) === priceId,
    ) ?? null
  );
}

export const FREE_PLAN_DAILY_SCAN_LIMIT =
  Number(process.env.FREE_PLAN_DAILY_SCAN_LIMIT) || 50;
export const FREE_PLAN_MAX_CONNECTED_SORTERS =
  Number(process.env.FREE_PLAN_MAX_CONNECTED_SORTERS) || 1;

let _portalConfigurationId: string | null = null;

export async function getCancelAtPeriodEndPortalConfigurationId(): Promise<
  string | undefined
> {
  if (_portalConfigurationId) return _portalConfigurationId;

  const stripe = getStripe();
  const { data } = await stripe.billingPortal.configurations.list({
    is_default: true,
    limit: 1,
  });
  const config = data[0];
  if (!config) return undefined;

  if (config.features.subscription_cancel?.mode !== "at_period_end") {
    await stripe.billingPortal.configurations.update(config.id, {
      features: {
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
  }

  _portalConfigurationId = config.id;
  return config.id;
}

const _businessPriceCache = new Map<
  string,
  { info: BusinessPriceInfo | null; cachedAt: number }
>();

async function getBusinessPriceInfo(
  interval: BillingInterval,
): Promise<BusinessPriceInfo | null> {
  const priceId = findBusinessPriceId(interval);
  if (!priceId) return null;

  const cached = _businessPriceCache.get(priceId);
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
  _businessPriceCache.set(priceId, { info, cachedAt: Date.now() });
  return info;
}

export async function getBusinessPrices(): Promise<BusinessPrices> {
  const [month, year] = await Promise.all(
    BILLING_INTERVALS.map((interval) =>
      getBusinessPriceInfo(interval).catch((err) => {
        console.error(err);
        return null;
      }),
    ),
  );
  return { month, year };
}
export const FREE_PLAN_MAX_SOUND_RULES =
  Number(process.env.FREE_PLAN_MAX_SOUND_RULES) || 1;
export const FREE_PLAN_MAX_NOTIFICATION_RULES =
  Number(process.env.FREE_PLAN_MAX_NOTIFICATION_RULES) || 1;
