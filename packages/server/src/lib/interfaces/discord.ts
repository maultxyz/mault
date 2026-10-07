import type { PriceSource } from "@magic-vault/shared";

export type DiscordEmbed = {
  title: string;
  description?: string;
  color: number;
  timestamp: string;
  url?: string;
  image?: { url: string };
  footer?: { text: string };
  fields?: { name: string; value: string; inline?: boolean }[];
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

export interface CardScannedEmbedOptions {
  isFoil?: boolean;
  foilType?: string;
  collectionName?: string;
  gameName?: string;
  collectionGuid?: string;
  capturedImageDataUrl?: string;
  priceSource?: PriceSource;
}

export interface CardScannedEmbedResult {
  embed: DiscordEmbed;
  referenceImageUrl?: string;
}

export interface NotifyConfig {
  channelId: string | null;
  threadId: string | null;
  source: "collection" | "org";
}
