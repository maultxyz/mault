import type {
  AnnouncementSeverity,
  Announcement,
  PlatformDiscordChannelsSettings,
  PlatformDiscordGuildSummary,
  PlatformDiscordLinkedRole,
  PlatformStatKey,
} from "@magic-vault/shared";

export interface PlatformDiscordAdminDraftFormValues {
  channels: PlatformDiscordChannelsSettings;
  stats: PlatformStatKey[];
  linkedRole: PlatformDiscordLinkedRole;
}

export interface AnnouncementFormValues {
  severity: AnnouncementSeverity;
  message: string;
  isActive: boolean;
  showOnLanding: boolean;
  link: string;
  startsAt: string;
  endsAt: string;
}

export type DiscordGuildTargetKind = "channel" | "role";

export interface DiscordGuildTargetFieldsProps {
  targetKind: DiscordGuildTargetKind;
  guilds: PlatformDiscordGuildSummary[];
  botReachable: boolean;
  guildId: string | null;
  targetId: string | null;
  onGuildChange: (guildId: string | null) => void;
  onTargetChange: (targetId: string | null) => void;
}

export interface DiscordAnnouncementRowProps {
  announcement: Announcement;
  onPress: () => void;
}

export interface DiscordScriptCommandProps {
  command: string;
  description: string;
}
