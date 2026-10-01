export type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
  footer?: { text: string };
};

export type DiscordNotificationKind = "scan" | "error";

export type DiscordNotifyOutcome = "sent" | "no_channel" | "failed";

export interface BotPostRequest {
  channelId: string;
  embed: DiscordEmbed;
  threadId?: string | null;
  threadName?: string;
  attachmentDataUrl?: string;
  secondaryImageUrl?: string;
  guildId?: string;
  pingRoleIds?: string[];
}
