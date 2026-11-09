import type { DiscordEmbed } from "./discord";

export interface CatalogSyncResult {
  gameKey: string;
  lang: string;
  succeeded: boolean;
  totalCards: number;
  newCards: number;
  updatedCards: number;
  newCardNames: string[];
  cardErrors: number;
  cardErrorSamples: string[];
  fatalError: string | null;
  durationMs: number;
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
