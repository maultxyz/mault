import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { webhookStripeRoute } from "../src/routes/public/webhook-stripe";

const WEBHOOK_SECRET = "whsec_test_secret";

function withStripeEnvironment(t: test.TestContext) {
  const saved = {
    AUTH_PROVIDER: process.env.AUTH_PROVIDER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };
  delete process.env.AUTH_PROVIDER;
  process.env.STRIPE_SECRET_KEY = "sk_test_webhook_route";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function postWebhook(payload: string, signature: string) {
  return webhookStripeRoute.request("/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body: payload,
  });
}

const unhandledEventPayload = JSON.stringify({
  id: "evt_test_webhook_route",
  object: "event",
  type: "customer.created",
  data: { object: { id: "cus_test", object: "customer" } },
});

test("a correctly signed Stripe event is accepted", async (t) => {
  withStripeEnvironment(t);
  const signature = new Stripe("sk_test_webhook_route").webhooks.generateTestHeaderString({
    payload: unhandledEventPayload,
    secret: WEBHOOK_SECRET,
  });
  const response = await postWebhook(unhandledEventPayload, signature);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
});

test("an event signed with another secret is rejected as unauthorized", async (t) => {
  withStripeEnvironment(t);
  const signature = new Stripe("sk_test_webhook_route").webhooks.generateTestHeaderString({
    payload: unhandledEventPayload,
    secret: "whsec_some_other_secret",
  });
  const response = await postWebhook(unhandledEventPayload, signature);
  assert.equal(response.status, 401);
});
