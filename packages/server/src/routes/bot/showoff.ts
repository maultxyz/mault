import { Hono } from "hono";
import { authProvider } from "../../auth";
import { loadBotCollectionStats } from "../../lib/bot-stats";
import { findUserIdByDiscordUser } from "../../lib/discord/user-links";
import type { AppEnv } from "../../middleware/auth";
import { resolveOrgByGuild } from "./shared";

export const botShowoffRoute = new Hono<AppEnv>().get("/showoff", async (c) => {
  const discordUserId = c.req.query("discordUserId");
  const guildId = c.req.query("guildId");
  if (!discordUserId) {
    return c.json(
      { success: false, message: "discordUserId is required." },
      400,
    );
  }

  const userId = await findUserIdByDiscordUser(discordUserId);
  if (!userId) {
    return c.json({ success: false, message: "account_not_linked" }, 404);
  }

  const orgs = await authProvider.listUserOrganisations(userId);
  if (orgs.length === 0) {
    return c.json({ success: false, message: "no_organizations" }, 404);
  }

  const guildOrgId = guildId ? await resolveOrgByGuild(guildId) : null;
  const guildOrg = orgs.find((org) => org.id === guildOrgId);
  const candidates = guildOrg ? [guildOrg] : orgs;
  const results = await Promise.all(
    candidates.map(async (org) => ({
      org,
      stats: await loadBotCollectionStats(org.id, null),
    })),
  );
  const best = results.reduce((a, b) =>
    b.stats.cardCount > a.stats.cardCount ? b : a,
  );

  return c.json({
    success: true,
    data: { ...best.stats, orgName: best.org.name },
  });
});
