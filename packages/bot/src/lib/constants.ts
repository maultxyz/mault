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

export const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3001";

export const BOT_API_SECRET = process.env.BOT_API_SECRET ?? "";

export const NOTIFY_SERVER_PORT = parseInt(process.env.BOT_PORT ?? "3002");

export const COMPOSITE_HEIGHT = 480;

export const COMPOSITE_GAP = 16;

export const SCAN_ATTACHMENT_NAME = "scan.jpg";

export const LINK_CONFIRM_TIMEOUT_MS = 30_000;

export const DISCORD_BLURPLE = 0x5865f2;

export const NOT_LINKED_MESSAGE =
  "This server isn't linked yet - run `/link <code>` first (generate a code from Magic Vault's Integrations page).";

export const PRESENCE_CYCLE_MS = 20_000;

export const PRESENCE_REFRESH_MS = 10 * 60 * 1000;

export const PRESENCE_RETRY_MS = 15_000;

export const PRESENCE_FALLBACK_STATUS = "for cards to sort";
