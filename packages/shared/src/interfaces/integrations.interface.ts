import type { BinRuleGroup } from "./sort-bins.interface";

export type DiscordChannelType = "text" | "announcement";

export interface DiscordChannel {
  id: string;
  name: string;
  type: DiscordChannelType;
  categoryName: string | null;
  missingPermissions: string[];
}

export interface DiscordGuildInfo {
  id: string;
  name: string;
  iconUrl: string | null;
  channels: DiscordChannel[];
}

export interface DiscordCollectionChannels {
  guid: string;
  name: string;
  scanChannelId: string | null;
  errorChannelId: string | null;
}

export interface DiscordRuleTarget {
  guid: string;
  name: string;
  gameName: string;
  isEnabled: boolean;
  channelId: string;
}

export interface DiscordIntegration {
  linked: boolean;
  botReachable: boolean;
  guild: DiscordGuildInfo | null;
  notifyOnScan: boolean;
  scanChannelId: string | null;
  errorChannelId: string | null;
  collections: DiscordCollectionChannels[];
  rules: DiscordRuleTarget[];
}

export interface NotificationRule {
  guid: string;
  gameGuid: string;
  name: string;
  isEnabled: boolean;
  rules: BinRuleGroup;
  channelId: string | null;
}

export interface NotificationRuleInput {
  name: string;
  isEnabled: boolean;
  rules: BinRuleGroup;
  channelId: string;
}

export interface DiscordChannelInput {
  kind: "scan" | "error";
  channelId: string | null;
  collectionGuid?: string;
}
