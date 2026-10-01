import { ChannelType, PermissionFlagsBits } from "discord.js";

export const NOTIFY_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
] as const;

export const NOTIFY_CHANNEL_PERMISSIONS = {
  "View Channel": PermissionFlagsBits.ViewChannel,
  "Send Messages": PermissionFlagsBits.SendMessages,
  "Embed Links": PermissionFlagsBits.EmbedLinks,
  "Attach Files": PermissionFlagsBits.AttachFiles,
  "Create Public Threads": PermissionFlagsBits.CreatePublicThreads,
  "Send Messages in Threads": PermissionFlagsBits.SendMessagesInThreads,
  "Read Message History": PermissionFlagsBits.ReadMessageHistory,
} as const;
