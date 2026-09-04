import type { HealthCheck, HealthCheckResponse } from "@magic-vault/shared";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import pkg from "../../package.json";
import { db } from "../db";
import { cardImageVectors, games, orgBilling } from "../db/schema";
import {
  buildDonationEmbed,
  parseBuyMeACoffeeWebhook,
  verifyBuyMeACoffeeSignature,
} from "../lib/buymeacoffee";
import { fetchCardApi } from "../lib/card-search/fetch";
import { sendDonationDiscordNotification } from "../lib/discord";
import { FAB_DEFAULT_URL } from "../lib/fab/search";
import { GUNDAM_DEFAULT_URL } from "../lib/gundam/search";
import { LORCANA_DEFAULT_URL } from "../lib/lorcana/search";
import { ONE_PIECE_DEFAULT_URL } from "../lib/onepiece/search";
import { POKEMON_DEFAULT_URL } from "../lib/pokemon/search";
import { SCRYFALL_DEFAULT_URL } from "../lib/scryfall/search";
import { getStripe, isBillingEnabled } from "../lib/stripe";
import { YUGIOH_DEFAULT_URL } from "../lib/yugioh/search";
import type { AppEnv } from "../middleware/auth";
import type Stripe from "stripe";

const router = new Hono<AppEnv>();

// GET /public/version — unauthenticated, polled by the web client to prompt a refresh on deploy.
router.get("/version", (c) => {
  return c.json({ success: true, data: { version: pkg.version } });
});

// GET /public/games — unauthenticated, for the marketing/landing page.
router.get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);

    const countRows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

    const langRows = await db
      .select({
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey, cardImageVectors.lang);
    const langsByKey = new Map<string, string[]>();
    for (const row of langRows) {
      const list = langsByKey.get(row.gameKey) ?? [];
      list.push(row.lang);
      langsByKey.set(row.gameKey, list);
    }

    const data = rows.map((row) => ({
      ...row,
      cardCount: countByKey.get(row.key) ?? 0,
      languages: (langsByKey.get(row.key) ?? []).sort(),
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

const EXTERNAL_API_CHECKS: { name: string; url: string; gameKey: string }[] = [
  {
    name: "Scryfall (Magic: The Gathering)",
    url: SCRYFALL_DEFAULT_URL,
    gameKey: "mtg",
  },
  { name: "TCGdex (Pokémon)", url: POKEMON_DEFAULT_URL, gameKey: "pokemon" },
  { name: "Gundam Card Game API", url: GUNDAM_DEFAULT_URL, gameKey: "gundam" },
  {
    name: "Lorcast (Disney Lorcana)",
    url: LORCANA_DEFAULT_URL,
    gameKey: "lorcana",
  },
  {
    name: "OPTCGAPI (One Piece)",
    url: ONE_PIECE_DEFAULT_URL,
    gameKey: "onepiece",
  },
  { name: "Flesh and Blood API", url: FAB_DEFAULT_URL, gameKey: "fab" },
  {
    name: "YGOPRODeck (Yu-Gi-Oh!)",
    url: YUGIOH_DEFAULT_URL,
    gameKey: "yugioh",
  },
];

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { name: "Database", status: "ok", latencyMs: Date.now() - start };
  } catch {
    return {
      name: "Database",
      status: "error",
      latencyMs: Date.now() - start,
      message: "Connection failed.",
    };
  }
}

async function checkExternalApi(
  name: string,
  url: string,
  gameKey: string,
): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetchCardApi(url, { method: "GET" });
    await response.body?.cancel();
    return { name, status: "ok", latencyMs: Date.now() - start, gameKey };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      name,
      status: "error",
      latencyMs: Date.now() - start,
      message: timedOut ? "Timed out." : "Unreachable.",
      gameKey,
    };
  }
}

const HEALTH_CACHE_TTL_MS = 20_000;
let cachedHealth: { data: HealthCheckResponse; expiresAt: number } | null =
  null;

// GET /public/health — unauthenticated. Polled by the app footer and the
// dedicated health page to surface upstream card-API/DB outages instead of
// letting them show up only as a failed search with no context.
router.get("/health", async (c) => {
  if (cachedHealth && cachedHealth.expiresAt > Date.now()) {
    return c.json({ success: true, data: cachedHealth.data });
  }

  const [database, ...externalApis] = await Promise.all([
    checkDatabase(),
    ...EXTERNAL_API_CHECKS.map((api) =>
      checkExternalApi(api.name, api.url, api.gameKey),
    ),
  ]);
  const checks = [database, ...externalApis];

  const data: HealthCheckResponse = {
    healthy: checks.every((check) => check.status === "ok"),
    checkedAt: new Date().toISOString(),
    checks,
  };
  cachedHealth = { data, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
  return c.json({ success: true, data });
});

// POST /public/webhooks/buymeacoffee — unauthenticated (no session exists to
// check; the HMAC signature below is what proves the request came from BMC).
// Set this route's full URL as the webhook endpoint in the Buy Me a Coffee
// dashboard so donations post into DISCORD_DONATION_CHANNEL_ID.
router.post("/webhooks/buymeacoffee", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-signature-sha256") ?? null;
  if (!verifyBuyMeACoffeeSignature(rawBody, signature)) {
    return c.json({ success: false, message: "Invalid signature." }, 401);
  }

  const payload = parseBuyMeACoffeeWebhook(rawBody);
  if (!payload) {
    return c.json({ success: false, message: "Invalid JSON." }, 400);
  }

  if (payload.type === "donation.created") {
    const embed = buildDonationEmbed(
      payload.data ?? {},
      payload.live_mode ?? true,
    );
    void sendDonationDiscordNotification(embed);
  }

  // Always 200 for a validly-signed, recognized-or-not event type, so BMC
  // doesn't treat an event we intentionally ignore (membership, refund, ...)
  // as a delivery failure and keep retrying it.
  return c.json({ success: true });
});

async function upsertOrgBillingFromSubscription(
  orgId: string,
  customerId: string,
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];
  // Some API versions represent a scheduled cancellation via cancel_at (a
  // timestamp) instead of the cancel_at_period_end boolean - a portal
  // cancellation can arrive with cancel_at_period_end: false and a populated
  // cancel_at, so check both rather than trusting the boolean alone.
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
router.post("/webhooks/stripe", async (c) => {
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
    console.error("[public] Stripe webhook signature verification failed:", err);
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
          await upsertOrgBillingFromSubscription(orgId, customerId, subscription);
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
          await upsertOrgBillingFromSubscription(orgId, customerId, subscription);
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

export { router as publicRouter };
