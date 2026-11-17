import type { DiscordEmbed } from "./discord";

export interface CatalogSyncResult {
  gameKey: string;
  lang: string;
  succeeded: boolean;
  newCards: number;
  updatedCards: number;
  removedCards?: number;
}

export interface CatalogSyncReportOptions {
  runUrl?: string;
  forceResync: boolean;
  timestamp: string;
}

export interface CatalogSyncReportPayload {
  allowed_mentions: { parse: [] };
  embeds: DiscordEmbed[];
}
