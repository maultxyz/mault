import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
} from "discord.js";
import { NOTIFY_CHANNEL_PERMISSIONS, NOTIFY_CHANNEL_TYPES } from "./constants";
import type { GuildChannelSummary, GuildRoleSummary } from "./interfaces";

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

export function listPingableRoles(guild: Guild): GuildRoleSummary[] {
  const canMentionAll =
    guild.members.me?.permissions.has(PermissionFlagsBits.MentionEveryone) ??
    false;
  return [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color ? role.hexColor : null,
      canPing: role.mentionable || canMentionAll,
    }));
}
