import { Hono } from "hono";
import { sendDiscordNotification } from "../../lib/discord";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { DISCORD_TEST_EMBEDS } from "../../lib/constants/discord";

export const testNotificationRoute = new Hono<AppEnv>().post(
  "/test",
  requireAuth,
  requireOrg,
  async (c) => {
    const { type } = await c.req.json<{ type: string }>();
    const embed = DISCORD_TEST_EMBEDS[type];
    if (!embed) {
      return c.json(
        { success: false, message: "Unknown notification type." },
        400,
      );
    }
    const orgId = c.get("orgId");
    const outcome = await sendDiscordNotification(
      orgId,
      {
        ...embed,
        color: 0xed4245,
        timestamp: new Date().toISOString(),
      },
      "error",
    );
    if (outcome === "no_channel") {
      return c.json(
        {
          success: false,
          reason: outcome,
          message:
            "No error channel is set. Run /notification in your Discord server to choose one.",
        },
        409,
      );
    }
    if (outcome === "failed") {
      return c.json(
        {
          success: false,
          reason: outcome,
          message: "The Discord bot couldn't post the test notification.",
        },
        502,
      );
    }
    return c.json({ success: true, message: "Test notification sent." });
  },
);
