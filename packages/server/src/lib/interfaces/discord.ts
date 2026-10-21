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

export type DiscordMemberRoleAction = "add" | "remove";

export interface DiscordUserLinkRedemption {
  userId: string;
  previousDiscordUserId: string | null;
}

export type DiscordNotifyOutcome = "sent" | "no_channel" | "failed";

export interface DiscordChannelCheckFailure {
  status: 400 | 502;
  message: string;
}

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

export type PriceSyncSourceOutcome =
  | { status: "updated"; prices: number; products?: number; failures?: number }
  | { status: "unchanged" }
  | { status: "failed" };

export interface PriceSyncSummary {
  forced: boolean;
  sources: Record<string, PriceSyncSourceOutcome>;
  refreshedCards: number | null;
}
