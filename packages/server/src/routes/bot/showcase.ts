import { Hono } from "hono";
import { listUserShowcaseTargets, loadUserShowcase } from "../../lib/bot-showcase";
import { BOT_SHOWCASE_KINDS } from "../../lib/constants/discord";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { findUserIdByDiscordUser } from "../../lib/discord/user-links";
import type { BotShowcaseKind } from "../../lib/interfaces/bot";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

function parseShowcaseKind(value: string | undefined): BotShowcaseKind | null {
  return (BOT_SHOWCASE_KINDS as readonly string[]).includes(value ?? "")
    ? (value as BotShowcaseKind)
    : null;
}

export const botShowcaseRoute = new Hono<AppEnv>()
  .get("/showcase-targets", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    const kind = parseShowcaseKind(c.req.query("kind"));
    if (!discordUserId || !kind) {
      return c.json(
        { success: false, message: "discordUserId and kind are required." },
        400,
      );
    }

    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) {
      return c.json({ success: false, message: "account_not_linked" }, 404);
    }

    const guildId = c.req.query("guildId");
    const guildOrgId = guildId ? await resolveOrgByGuild(guildId) : null;
    return c.json({
      success: true,
      data: await listUserShowcaseTargets(
        userId,
        kind,
        guildOrgId,
        c.req.query("query") ?? "",
      ),
    });
  })
  .get("/showcase", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    const kind = parseShowcaseKind(c.req.query("kind"));
    const guid = c.req.query("guid");
    if (!discordUserId || !kind || !guid || !UUID_PATTERN.test(guid)) {
      return c.json(
        { success: false, message: "discordUserId, kind and guid are required." },
        400,
      );
    }

    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) {
      return c.json({ success: false, message: "account_not_linked" }, 404);
    }

    const showcase = await loadUserShowcase(userId, kind, guid);
    if (!showcase) {
      return c.json({ success: false, message: "showcase_not_found" }, 404);
    }
    return c.json({ success: true, data: showcase });
  });
