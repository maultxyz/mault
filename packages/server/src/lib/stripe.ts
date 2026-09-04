import Stripe from "stripe";

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

export function getBusinessPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_BUSINESS;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID_BUSINESS is not configured.");
  }
  return priceId;
}

export const FREE_PLAN_DAILY_SCAN_LIMIT =
  Number(process.env.FREE_PLAN_DAILY_SCAN_LIMIT) || 50;

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
