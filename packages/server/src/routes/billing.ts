import { and, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../db";
import { collectionCards, orgBilling } from "../db/schema";
import {
  FREE_PLAN_DAILY_SCAN_LIMIT,
  getBusinessPriceId,
  getCancelAtPeriodEndPortalConfigurationId,
  getStripe,
  isBillingEnabled,
} from "../lib/stripe";
import {
  getUserContact,
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../middleware/auth";

const router = new Hono<AppEnv>();

function webUrl(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

router.use("*", async (c, next) => {
  if (!isBillingEnabled()) {
    return c.json({ success: false, message: "Billing is not enabled." }, 404);
  }
  await next();
});

router.get("/", requireAuth, requireOrg, async (c) => {
  const orgId = c.get("orgId");
  try {
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const billing = await tx.query.orgBilling.findFirst({
        where: eq(orgBilling.orgId, orgId),
      });
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(collectionCards)
        .where(
          and(
            eq(collectionCards.orgId, orgId),
            gte(collectionCards.scannedAt, startOfTodayUtc()),
          ),
        );

      const plan = (billing?.plan as "free" | "business") ?? "free";
      return {
        success: true,
        message: "Loaded.",
        data: {
          plan,
          status: billing?.status ?? null,
          cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: billing?.currentPeriodEnd ?? null,
          cardsScannedToday: count,
          dailyLimit: plan === "business" ? null : FREE_PLAN_DAILY_SCAN_LIMIT,
        },
      };
    });
    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post(
  "/checkout",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    try {
      const stripeCustomerId = await authQuery(
        c.get("jwtClaims"),
        async (tx) => {
          const existing = await tx.query.orgBilling.findFirst({
            where: eq(orgBilling.orgId, orgId),
          });
          if (existing?.stripeCustomerId) return existing.stripeCustomerId;

          const { email } = await getUserContact(userId);
          const customer = await getStripe().customers.create({
            email: email ?? undefined,
            metadata: { orgId },
          });

          await tx
            .insert(orgBilling)
            .values({ orgId, stripeCustomerId: customer.id })
            .onConflictDoUpdate({
              target: [orgBilling.orgId],
              set: { stripeCustomerId: customer.id, updatedAt: new Date() },
            });

          return customer.id;
        },
      );

      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        client_reference_id: orgId,
        metadata: { orgId },
        line_items: [{ price: getBusinessPriceId(), quantity: 1 }],
        success_url: `${webUrl()}/app/settings?billing=success`,
        cancel_url: `${webUrl()}/app/settings?billing=cancelled`,
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

router.post(
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

export { router as billingRouter };
