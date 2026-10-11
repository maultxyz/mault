import type {
  DiscordChannel,
  DiscordRole,
  DiscordIntegration,
  NotificationRule,
  WebhookEndpoint,
  WebhookEndpointInput,
} from "@magic-vault/shared";

export interface NotificationRuleListProps {
  gameGuid: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}

export interface NotificationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NotificationRule | null;
  gameGuid: string;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}

export interface DiscordRoleLabelProps {
  role: DiscordRole | null;
  roleId: string;
}

export interface DiscordRoleSelectProps {
  value: string | null;
  roles: DiscordRole[];
  onChange: (roleId: string | null) => void;
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

export interface DiscordCollectionOverridesProps {
  integration: DiscordIntegration;
}

export interface CollectionOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: DiscordIntegration;
}

export interface PendingDiscordLinkCode {
  code: string;
  expiresAt: number;
}

export interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: WebhookEndpoint | null;
  isSaving: boolean;
  onSubmit: (input: WebhookEndpointInput) => void;
}
