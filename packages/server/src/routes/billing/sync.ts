import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { orgBilling } from "../../db/schema";
import { syncOrgBillingFromStripe } from "../../lib/stripe-billing-sync";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";

export const syncBillingRoute = new Hono<AppEnv>().post(
  "/sync",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    const billing = await authQuery(c.get("jwtClaims"), (tx) =>
      tx.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
        columns: { stripeCustomerId: true },
      }),
    );
    if (billing?.stripeCustomerId) {
      await syncOrgBillingFromStripe(orgId, billing.stripeCustomerId);
    }
    return c.json({ success: true, message: "Synced." });
  },
);
