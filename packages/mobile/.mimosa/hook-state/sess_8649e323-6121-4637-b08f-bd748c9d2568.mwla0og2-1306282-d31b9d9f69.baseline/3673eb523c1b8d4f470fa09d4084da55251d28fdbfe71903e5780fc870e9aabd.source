import {
  PLATFORM_STAT_KEYS,
  type AdminPlatformDiscordChannelsResponse,
  type AdminPlatformStatsResponse,
  type PlatformDiscordLinkedRole,
} from "@magic-vault/shared";
import { z } from "zod";
import { EMPTY_PLATFORM_DISCORD_ADMIN_DRAFT } from "@/lib/constants/admin-discord";
import type { PlatformDiscordAdminDraftFormValues } from "@/lib/interfaces/admin-discord";

const platformDiscordChannelSchema = z.object({
  guildId: z.string().nullable(),
  channelId: z.string().nullable(),
});

export const platformDiscordAdminDraftSchema = z.object({
  channels: z.object({
    stats: platformDiscordChannelSchema,
    donations: platformDiscordChannelSchema,
    pricing: platformDiscordChannelSchema,
  }),
  stats: z.array(z.enum(PLATFORM_STAT_KEYS)),
  linkedRole: z.object({
    guildId: z.string().nullable(),
    roleId: z.string().nullable(),
  }),
});

export function toPlatformDiscordAdminDraft(
  channels: AdminPlatformDiscordChannelsResponse | null | undefined,
  stats: AdminPlatformStatsResponse | null | undefined,
  linkedRole: PlatformDiscordLinkedRole | null | undefined,
): PlatformDiscordAdminDraftFormValues {
  return {
    channels: channels?.settings ?? EMPTY_PLATFORM_DISCORD_ADMIN_DRAFT.channels,
    stats: stats?.settings.stats ?? EMPTY_PLATFORM_DISCORD_ADMIN_DRAFT.stats,
    linkedRole: linkedRole ?? EMPTY_PLATFORM_DISCORD_ADMIN_DRAFT.linkedRole,
  };
}

export function hasSameValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function toggledPlatformStatKeys(
  selectedStatKeys: PlatformDiscordAdminDraftFormValues["stats"],
  toggledStatKey: PlatformDiscordAdminDraftFormValues["stats"][number],
  isSelected: boolean,
): PlatformDiscordAdminDraftFormValues["stats"] {
  return PLATFORM_STAT_KEYS.filter((statKey) =>
    statKey === toggledStatKey ? isSelected : selectedStatKeys.includes(statKey),
  );
}
