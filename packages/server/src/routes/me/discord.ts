import { Hono } from "hono";
import { updateLinkedAccountRole } from "../../lib/discord/member-roles";
import {
  createDiscordUserLinkCode,
  loadDiscordUserLink,
  unlinkDiscordUser,
} from "../../lib/discord/user-links";
import { requireAuth, type AppEnv } from "../../middleware/auth";

export const meDiscordRoute = new Hono<AppEnv>()
  .get("/discord", requireAuth, async (c) => {
    const data = await loadDiscordUserLink(c.get("userId"));
    return c.json({ success: true, data });
  })
  .post("/discord/link-code", requireAuth, async (c) => {
    if (c.get("impersonatedBy")) {
      return c.json(
        {
          success: false,
          message: "Discord accounts can't be linked while impersonating.",
        },
        400,
      );
    }
    const data = await createDiscordUserLinkCode(c.get("userId"));
    return c.json({ success: true, message: "Code generated.", data });
  })
  .post("/discord/unlink", requireAuth, async (c) => {
    const previous = await unlinkDiscordUser(c.get("userId"));
    if (previous) void updateLinkedAccountRole(previous, "remove");
    return c.json({ success: true, message: "Unlinked." });
  });
