import { Hono } from "hono";
import {
  buildDonationEmbed,
  parseBuyMeACoffeeWebhook,
  verifyBuyMeACoffeeSignature,
} from "../../lib/buymeacoffee";
import { sendDonationDiscordNotification } from "../../lib/discord";
import type { AppEnv } from "../../middleware/auth";

// POST /public/webhooks/buymeacoffee — unauthenticated (no session exists to
// check; the HMAC signature below is what proves the request came from BMC).
// Set this route's full URL as the webhook endpoint in the Buy Me a Coffee
// dashboard so donations post into DISCORD_DONATION_CHANNEL_ID.
export const webhookBuyMeACoffeeRoute = new Hono<AppEnv>().post(
  "/webhooks/buymeacoffee",
  async (c) => {
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

    return c.json({ success: true });
  },
);
