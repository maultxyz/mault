import type { ChatInputCommandInteraction } from "discord.js";
import { NOTIFY_CHANNEL_PERMISSIONS, NOTIFY_CHANNEL_TYPES } from "./constants";

export function isNotifyChannelType(type: number) {
  return (NOTIFY_CHANNEL_TYPES as readonly number[]).includes(type);
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
  const me = interaction.guild.members.me;
  const permissions = channel && me ? channel.permissionsFor(me) : null;
  if (!permissions) {
    return { error: `I can't see <#${picked.id}>. Give me access to it first.` };
  }

  const missing = Object.entries(NOTIFY_CHANNEL_PERMISSIONS)
    .filter(([, flag]) => !permissions.has(flag))
    .map(([name]) => name);
  if (missing.length) {
    return {
      error: `I'm missing these permissions in <#${picked.id}>: ${missing.join(", ")}.`,
    };
  }

  return { channelId: picked.id };
}
