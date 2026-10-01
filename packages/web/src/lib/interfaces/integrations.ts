import type {
  DiscordChannel,
  DiscordIntegration,
  NotificationRule,
} from "@magic-vault/shared";

export interface DiscordChannelListProps {
  integration: DiscordIntegration;
}

export type DiscordChannelUsage =
  | { kind: "scans"; paused: boolean }
  | { kind: "errors" }
  | { kind: "collectionScans"; collection: string }
  | { kind: "collectionErrors"; collection: string }
  | { kind: "rule"; rule: string; game: string; isEnabled: boolean };

export interface DiscordChannelUsageRow {
  channelId: string;
  channel: DiscordChannel | null;
  usages: DiscordChannelUsage[];
}

export interface NotificationRuleListProps {
  gameGuid: string;
  channels: DiscordChannel[];
}

export interface NotificationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NotificationRule | null;
  gameGuid: string;
  channels: DiscordChannel[];
}

export interface DiscordChannelLabelProps {
  channel: DiscordChannel | null;
  channelId: string;
}

export interface DiscordChannelSelectProps {
  value: string | null;
  channels: DiscordChannel[];
  emptyLabel: string;
  disabled?: boolean;
  onChange: (channelId: string | null) => void;
}

export interface DiscordChannelSettingsProps {
  integration: DiscordIntegration;
}
