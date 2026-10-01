import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery, db } from "../../db";
import { orgBilling } from "../../db/schema";
import {
  getBusinessPriceId,
  getStripe,
} from "../../lib/stripe";
import {
  getUserContact,
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { webUrl } from "./shared";

export const checkoutBillingRoute = new Hono<AppEnv>().post(
  "/checkout",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    try {
      const existing = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.orgBilling.findFirst({
          where: eq(orgBilling.orgId, orgId),
          columns: { stripeCustomerId: true },
        }),
      );
      let stripeCustomerId = existing?.stripeCustomerId;
      if (!stripeCustomerId) {
        const { email } = await getUserContact(userId);
        const customer = await getStripe().customers.create({
          email: email ?? undefined,
          metadata: { orgId },
        });
        await db
          .insert(orgBilling)
          .values({ orgId, stripeCustomerId: customer.id })
          .onConflictDoUpdate({
            target: [orgBilling.orgId],
            set: { stripeCustomerId: customer.id, updatedAt: new Date() },
          });
        stripeCustomerId = customer.id;
      }

      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        client_reference_id: orgId,
        metadata: { orgId },
        line_items: [{ price: getBusinessPriceId(), quantity: 1 }],
        success_url: `${webUrl()}/app/settings/billing?billing=success`,
        cancel_url: `${webUrl()}/app/settings/billing?billing=cancelled`,
      });

      if (!session.url) {
        return c.json(
          { success: false, message: "Failed to create checkout session." },
          500,
        );
      }
      return c.json({ success: true, message: "Created.", data: { url: session.url } });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Stripe error." }, 500);
    }
  },
);
