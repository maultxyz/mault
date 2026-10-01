import {
  DISCORD_SNOWFLAKE_PATTERN,
  type DiscordGuildInfo,
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
  roleId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN).nullable().default(null),
});

const optionalChannelSchema = z
  .string()
  .regex(DISCORD_SNOWFLAKE_PATTERN)
  .nullable()
  .optional();

export const channelInputSchema = z
  .object({
    scanChannelId: optionalChannelSchema,
    errorChannelId: optionalChannelSchema,
    collectionGuid: z.string().uuid().optional(),
  })
  .refine(
    (input) =>
      input.scanChannelId !== undefined || input.errorChannelId !== undefined,
  );

export function channelUpdate(
  input: z.infer<typeof channelInputSchema>,
  updatedAt: Date,
) {
  return {
    ...(input.scanChannelId !== undefined && {
      discordScanChannelId: input.scanChannelId,
      discordScanThreadId: null,
    }),
    ...(input.errorChannelId !== undefined && {
      discordErrorChannelId: input.errorChannelId,
      discordErrorThreadId: null,
    }),
    updatedAt,
  };
}

async function loadLinkedGuild(
  orgId: string,
): Promise<{ guild: DiscordGuildInfo } | { error: string }> {
  const [settings] = await db
    .select({ guildId: orgSettings.discordGuildId })
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);
  if (!settings?.guildId) return { error: "Link a Discord server first." };

  const { reachable, guild } = await fetchDiscordGuild(settings.guildId);
  if (!reachable) {
    return { error: "Couldn't reach the Discord bot. Try again shortly." };
  }
  if (!guild) return { error: "The bot isn't in your linked Discord server." };
  return { guild };
}

function channelError(
  guild: DiscordGuildInfo,
  channelId: string,
): string | null {
  const channel = guild.channels.find((c) => c.id === channelId);
  if (!channel) return "That channel isn't in your linked Discord server.";
  if (channel.missingPermissions.length) {
    return `The bot is missing these permissions in #${channel.name}: ${channel.missingPermissions.join(", ")}.`;
  }
  return null;
}

export async function checkDiscordChannel(
  orgId: string,
  channelId: string,
): Promise<string | null> {
  const linked = await loadLinkedGuild(orgId);
  if ("error" in linked) return linked.error;
  return channelError(linked.guild, channelId);
}

export async function checkRuleTargets(
  orgId: string,
  channelId: string,
  roleId: string | null,
): Promise<string | null> {
  const linked = await loadLinkedGuild(orgId);
  if ("error" in linked) return linked.error;
  const error = channelError(linked.guild, channelId);
  if (error || !roleId) return error;
  const role = linked.guild.roles.find((r) => r.id === roleId);
  if (!role) return "That role isn't in your linked Discord server.";
  if (!role.canPing) {
    return `The bot can't ping @${role.name}. Make the role mentionable, or give the bot the "Mention @everyone, @here, and All Roles" permission.`;
  }
  return null;
}
