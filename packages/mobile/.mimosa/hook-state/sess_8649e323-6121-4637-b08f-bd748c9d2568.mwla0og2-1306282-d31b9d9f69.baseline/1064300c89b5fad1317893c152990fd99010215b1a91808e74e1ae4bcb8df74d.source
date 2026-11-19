import type { AnnouncementSeverity, PlatformDiscordChannelKey } from "@magic-vault/shared";
import type { StatusTone } from "@/lib/interfaces/theme";
import type { AnnouncementFormValues, PlatformDiscordAdminDraftFormValues } from "@/lib/interfaces/admin-discord";

export const ADMIN_DISCORD_CHANNELS_QUERY_KEY = ["admin", "discord", "channels"] as const;
export const ADMIN_DISCORD_LINKED_ROLE_QUERY_KEY = ["admin", "discord", "linked-role"] as const;
export const ADMIN_DISCORD_PLATFORM_STATS_QUERY_KEY = ["admin", "discord", "platform-stats"] as const;
export const ADMIN_DISCORD_ANNOUNCEMENTS_QUERY_KEY = ["admin", "discord", "announcements"] as const;

export const ADMIN_DISCORD_ANNOUNCEMENT_ROUTE = "/admin/discord/announcement";


export const EMPTY_PLATFORM_DISCORD_ADMIN_DRAFT: PlatformDiscordAdminDraftFormValues = {
  channels: {
    stats: { guildId: null, channelId: null },
    donations: { guildId: null, channelId: null },
    pricing: { guildId: null, channelId: null },
  },
  stats: [],
  linkedRole: { guildId: null, roleId: null },
};

export const PLATFORM_DISCORD_CHANNEL_SECTIONS: readonly PlatformDiscordChannelKey[] = ["stats", "donations", "pricing"];

export const ANNOUNCEMENT_SEVERITIES = ["info", "warning", "danger"] as const satisfies readonly AnnouncementSeverity[];

export const ANNOUNCEMENT_SEVERITY_TONE: Record<AnnouncementSeverity, StatusTone> = {
  info: "info",
  warning: "warning",
  danger: "destructive",
};

export const ANNOUNCEMENT_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

export const ANNOUNCEMENT_VALIDATION_KEY_PREFIX = "admin.discord.announcements.validation.";

export const EMPTY_ANNOUNCEMENT_FORM: AnnouncementFormValues = {
  severity: "info",
  message: "",
  isActive: true,
  showOnLanding: false,
  link: "",
  startsAt: "",
  endsAt: "",
};
