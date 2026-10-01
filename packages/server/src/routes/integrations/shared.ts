import {
  DISCORD_SNOWFLAKE_PATTERN,
  NOTIFICATION_RULE_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import { fetchDiscordGuild } from "../../lib/discord";
import { ruleGroupSchema } from "../../lib/rule-groups";

export const notificationRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(NOTIFICATION_RULE_NAME_MAX_LENGTH),
  isEnabled: z.boolean(),
  rules: ruleGroupSchema,
  channelId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN),
});

export async function checkRuleChannel(
  orgId: string,
  channelId: string,
): Promise<string | null> {
  const [settings] = await db
    .select({ guildId: orgSettings.discordGuildId })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  if (!settings?.guildId) return "Link a Discord server first.";

  const { reachable, guild } = await fetchDiscordGuild(settings.guildId);
  if (!reachable) return "Couldn't reach the Discord bot. Try again shortly.";
  const channel = guild?.channels.find((c) => c.id === channelId);
  if (!channel) return "That channel isn't in your linked Discord server.";
  if (channel.missingPermissions.length) {
    return `The bot is missing these permissions in #${channel.name}: ${channel.missingPermissions.join(", ")}.`;
  }
  return null;
}
