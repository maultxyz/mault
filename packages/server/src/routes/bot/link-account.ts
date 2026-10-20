import { Hono } from "hono";
import { authProvider } from "../../auth";
import { redeemDiscordUserLinkCode } from "../../lib/discord/user-links";
import type { AppEnv } from "../../middleware/auth";

export const botLinkAccountRoute = new Hono<AppEnv>().post(
  "/link-account",
  async (c) => {
    const body = await c.req.json<{
      discordUserId?: string;
      discordUsername?: string;
      code?: string;
    }>();
    const code = body.code?.trim().toUpperCase();
    if (!body.discordUserId || !body.discordUsername || !code) {
      return c.json(
        {
          success: false,
          message: "discordUserId, discordUsername and code are required.",
        },
        400,
      );
    }

    const userId = await redeemDiscordUserLinkCode(
      code,
      body.discordUserId,
      body.discordUsername,
    );
    if (!userId) {
      return c.json({ success: false, message: "Invalid or expired code." }, 400);
    }

    const contact = await authProvider.getUserContact(userId);
    return c.json({
      success: true,
      message: "Linked.",
      data: { userName: contact.name || null },
    });
  },
);
