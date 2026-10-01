import {
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildBasedChannel,
} from "discord.js";
import { NOTIFY_CHANNEL_PERMISSIONS, NOTIFY_CHANNEL_TYPES } from "./constants";
import type { GuildChannelSummary } from "./interfaces";

export function isNotifyChannelType(type: number) {
  return (NOTIFY_CHANNEL_TYPES as readonly number[]).includes(type);
}

export function missingNotifyPermissions(
  channel: GuildBasedChannel,
  guild: Guild,
): string[] | null {
  const me = guild.members.me;
  const permissions = me ? channel.permissionsFor(me) : null;
  if (!permissions) return null;
  return Object.entries(NOTIFY_CHANNEL_PERMISSIONS)
    .filter(([, flag]) => !permissions.has(flag))
    .map(([name]) => name);
}

export function listNotifyChannels(guild: Guild): GuildChannelSummary[] {
  return [...guild.channels.cache.values()]
    .filter((channel) => isNotifyChannelType(channel.type))
    .sort((a, b) => {
      const categoryA = a.parent?.rawPosition ?? -1;
      const categoryB = b.parent?.rawPosition ?? -1;
      if (categoryA !== categoryB) return categoryA - categoryB;
      const positionA = "rawPosition" in a ? a.rawPosition : 0;
      const positionB = "rawPosition" in b ? b.rawPosition : 0;
      return positionA - positionB;
    })
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type:
        channel.type === ChannelType.GuildAnnouncement
          ? "announcement"
          : "text",
      categoryName: channel.parent?.name ?? null,
      missingPermissions: missingNotifyPermissions(channel, guild) ?? [
        "View Channel",
      ],
    }));
}

export async function resolveNotifyChannel(
  interaction: ChatInputCommandInteraction,
): Promise<{ channelId: string } | { error: string }> {
  const picked =
    interaction.options.getChannel("channel") ?? interaction.channel;
  if (!picked || !isNotifyChannelType(picked.type) || !interaction.guild) {
    return { error: "Pick a text or announcement channel for this." };
  }

  const channel = await interaction.guild.channels
    .fetch(picked.id)
    .catch(() => null);
  const missing = channel
    ? missingNotifyPermissions(channel, interaction.guild)
    : null;
  if (!missing) {
    return { error: `I can't see <#${picked.id}>. Give me access to it first.` };
  }
  if (missing.length) {
    return {
      error: `I'm missing these permissions in <#${picked.id}>: ${missing.join(", ")}.`,
    };
  }

  return { channelId: picked.id };
}
