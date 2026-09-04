import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Self-hosted (AUTH_PROVIDER=local) installs never need a Stripe account -
// billing is a hosted-SaaS-only concern, gated off entirely when either the
// provider is local or no secret key is configured.
export function isBillingEnabled(): boolean {
  return process.env.AUTH_PROVIDER !== "local" && !!process.env.STRIPE_SECRET_KEY;
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

// Stripe's default Customer Portal configuration cancels subscriptions
// immediately unless its "subscription_cancel" feature is explicitly set to
// "at_period_end" - without this, a customer canceling via the portal jumps
// straight to the free plan instead of the org staying on Business until the
// period they already paid for ends (which is what orgBilling.cancelAtPeriodEnd
// is meant to represent). This patches the account's default configuration
// in place the first time it's needed, then caches the id for the process
// lifetime.
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
