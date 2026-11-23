import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import { BOT_CACHE_MAX_ENTRIES, BOT_LOOKUP_CACHE_TTL_MS } from "../constants/discord";
import { createKeyedCache } from "../keyed-cache";

const orgIdByGuildCache = createKeyedCache<string | null>(
  "discord.orgIdByGuild",
  BOT_LOOKUP_CACHE_TTL_MS,
  BOT_CACHE_MAX_ENTRIES,
);

async function loadOrgIdByGuild(guildId: string): Promise<string | null> {
  const rows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(eq(orgSettings.discordGuildId, guildId))
    .limit(1);
  return rows[0]?.orgId ?? null;
}

export function resolveOrgByGuild(guildId: string): Promise<string | null> {
  return orgIdByGuildCache.get(guildId, () => loadOrgIdByGuild(guildId));
}

export function forgetDiscordGuildOrgs(): void {
  orgIdByGuildCache.clear();
}
