import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgBilling } from "../../db/schema";
import {
  getCancelAtPeriodEndPortalConfigurationId,
  getStripe,
} from "../../lib/stripe";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { webUrl } from "./shared";

export const portalBillingRoute = new Hono<AppEnv>().post(
  "/portal",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const billing = await authQuery(c.get("jwtClaims"), (tx) =>
        tx.query.orgBilling.findFirst({ where: eq(orgBilling.orgId, orgId) }),
      );
      if (!billing?.stripeCustomerId) {
        return c.json(
          { success: false, message: "No billing account for this organization yet." },
          400,
        );
      }

      const configuration = await getCancelAtPeriodEndPortalConfigurationId();
      const session = await getStripe().billingPortal.sessions.create({
        customer: billing.stripeCustomerId,
        return_url: `${webUrl()}/app/settings`,
        ...(configuration ? { configuration } : {}),
      });
      return c.json({ success: true, message: "Created.", data: { url: session.url } });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Stripe error." }, 500);
    }
  },
);
