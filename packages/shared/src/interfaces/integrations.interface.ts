import type { BinRuleGroup } from "./sort-bins.interface";

export type DiscordChannelType = "text" | "announcement";

export interface DiscordChannel {
  id: string;
  name: string;
  type: DiscordChannelType;
  categoryName: string | null;
  missingPermissions: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string | null;
  canPing: boolean;
}

export interface DiscordGuildInfo {
  id: string;
  name: string;
  iconUrl: string | null;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}

export interface DiscordCollectionChannels {
  guid: string;
  name: string;
  scanChannelId: string | null;
  errorChannelId: string | null;
}

export interface DiscordIntegration {
  linked: boolean;
  botReachable: boolean;
  guild: DiscordGuildInfo | null;
  notifyOnScan: boolean;
  scanChannelId: string | null;
  errorChannelId: string | null;
  collections: DiscordCollectionChannels[];
}

export interface NotificationRule {
  guid: string;
  gameGuid: string;
  name: string;
  isEnabled: boolean;
  rules: BinRuleGroup;
  channelId: string | null;
  roleId: string | null;
}

export interface NotificationRuleInput {
  name: string;
  isEnabled: boolean;
  rules: BinRuleGroup;
  channelId: string;
  roleId: string | null;
}

export interface DiscordChannelInput {
  scanChannelId?: string | null;
  errorChannelId?: string | null;
  collectionGuid?: string;
}
