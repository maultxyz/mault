import { Hono } from "hono";
import { authProvider } from "../../auth";
import { updateLinkedAccountRole } from "../../lib/discord/member-roles";
import { redeemDiscordUserLinkCode } from "../../lib/discord/user-links";
import type { AppEnv } from "../../middleware/auth";

export const botLinkAccountRoute = new Hono<AppEnv>()
  .post("/link-account", async (c) => {
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

    const redemption = await redeemDiscordUserLinkCode(
      code,
      body.discordUserId,
      body.discordUsername,
    );
    if (!redemption) {
      return c.json({ success: false, message: "Invalid or expired code." }, 400);
    }

    void updateLinkedAccountRole(body.discordUserId, "add");
    if (redemption.previousDiscordUserId) {
      void updateLinkedAccountRole(redemption.previousDiscordUserId, "remove");
    }

    const contact = await authProvider.getUserContact(redemption.userId);
    return c.json({
      success: true,
      message: "Linked.",
      data: { userName: contact.name || null },
    });
  });
