import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type Stripe from "stripe";
import { db } from "../../db";
import { orgBilling } from "../../db/schema";
import { isBillingEnabled } from "../../lib/stripe";
import { syncOrgBillingFromStripe } from "../../lib/stripe-billing-sync";
import type { AppEnv } from "../../middleware/auth";

export const webhookStripeRoute = new Hono<AppEnv>().post(
  "/webhooks/stripe",
  async (c) => {
    if (!isBillingEnabled()) {
      return c.json(
        { success: false, message: "Billing is not enabled." },
        404,
      );
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
          if (orgId && customerId) {
            await syncOrgBillingFromStripe(orgId, customerId);
          }
          break;
        }
        case "customer.subscription.created":
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
          const isForDeletedOrg =
            !existing && subscription.status === "canceled";
          if (orgId && !isForDeletedOrg) {
            await syncOrgBillingFromStripe(orgId, customerId);
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("[public] Stripe webhook handling failed:", err);
      return c.json(
        { success: false, message: "Webhook handling failed." },
        500,
      );
    }

    return c.json({ success: true });
  },
);
