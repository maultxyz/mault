import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type Stripe from "stripe";
import { db } from "../../db";
import { orgBilling } from "../../db/schema";
import { getStripe, isBillingEnabled } from "../../lib/stripe";
import type { AppEnv } from "../../middleware/auth";

async function upsertOrgBillingFromSubscription(
  orgId: string,
  customerId: string,
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];
  const cancelAtPeriodEnd =
    subscription.cancel_at_period_end || subscription.cancel_at != null;
  await db
    .insert(orgBilling)
    .values({
      orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? null,
      plan: subscription.status === "canceled" ? "free" : "business",
      status: subscription.status,
      currentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd,
    })
    .onConflictDoUpdate({
      target: [orgBilling.orgId],
      set: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price.id ?? null,
        plan: subscription.status === "canceled" ? "free" : "business",
        status: subscription.status,
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

// POST /public/webhooks/stripe — unauthenticated (Stripe has no session to
// present; the signature below is what proves the request came from Stripe).
// Set this route's full URL as the endpoint in the Stripe dashboard.
export const webhookStripeRoute = new Hono<AppEnv>().post("/webhooks/stripe", async (c) => {
  if (!isBillingEnabled()) {
    return c.json({ success: false, message: "Billing is not enabled." }, 404);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return c.json({ success: false, message: "Invalid signature." }, 401);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error(
      "[public] Stripe webhook signature verification failed:",
      err,
    );
    return c.json({ success: false, message: "Invalid signature." }, 401);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id ?? session.metadata?.orgId;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;
        if (orgId && customerId && subscriptionId) {
          const subscription =
            await getStripe().subscriptions.retrieve(subscriptionId);
          await upsertOrgBillingFromSubscription(
            orgId,
            customerId,
            subscription,
          );
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const existing = await db.query.orgBilling.findFirst({
          where: eq(orgBilling.stripeCustomerId, customerId),
        });
        const orgId = existing?.orgId ?? subscription.metadata?.orgId;
        if (orgId) {
          await upsertOrgBillingFromSubscription(
            orgId,
            customerId,
            subscription,
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[public] Stripe webhook handling failed:", err);
    return c.json({ success: false, message: "Webhook handling failed." }, 500);
  }

  return c.json({ success: true });
});
