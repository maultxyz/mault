import { queryOptions } from "@tanstack/react-query";
import type {
  AdminPlatformDiscordChannelsResponse,
  AdminPlatformDiscordGuildResponse,
  AdminPlatformStatsResponse,
  PlatformDiscordChannelsSettings,
  PlatformDiscordLinkedRole,
  PlatformStatsSettings,
  Result,
} from "@magic-vault/shared";
import { apiGet, apiPost, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import {
  ADMIN_DISCORD_CHANNELS_QUERY_KEY,
  ADMIN_DISCORD_LINKED_ROLE_QUERY_KEY,
  ADMIN_DISCORD_PLATFORM_STATS_QUERY_KEY,
} from "@/lib/constants/admin-discord";

export const platformDiscordChannelsQueryOptions = queryOptions({
  queryKey: ADMIN_DISCORD_CHANNELS_QUERY_KEY,
  queryFn: () =>
    unwrapOr(apiGet<Result<AdminPlatformDiscordChannelsResponse>>("/api/admin/discord-channels"), null),
});

export const platformDiscordGuildQueryOptions = (guildId: string | null) =>
  queryOptions({
    queryKey: [...ADMIN_DISCORD_CHANNELS_QUERY_KEY, "guild", guildId] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<AdminPlatformDiscordGuildResponse>>(
          `/api/admin/discord-channels/guilds/${encodeURIComponent(guildId ?? "")}`,
        ),
        null,
      ),
    enabled: !!guildId,
  });

export const platformDiscordLinkedRoleQueryOptions = queryOptions({
  queryKey: ADMIN_DISCORD_LINKED_ROLE_QUERY_KEY,
  queryFn: () => unwrapOr(apiGet<Result<PlatformDiscordLinkedRole>>("/api/admin/discord-linked-role"), null),
});

export const platformStatsQueryOptions = queryOptions({
  queryKey: ADMIN_DISCORD_PLATFORM_STATS_QUERY_KEY,
  queryFn: () => unwrapOr(apiGet<Result<AdminPlatformStatsResponse>>("/api/admin/platform-stats"), null),
});

export function savePlatformDiscordChannels(
  settings: PlatformDiscordChannelsSettings,
): Promise<AdminPlatformDiscordChannelsResponse> {
  return unwrap(apiPut<Result<AdminPlatformDiscordChannelsResponse>>("/api/admin/discord-channels", settings));
}

export function savePlatformDiscordLinkedRole(role: PlatformDiscordLinkedRole): Promise<PlatformDiscordLinkedRole> {
  return unwrap(apiPut<Result<PlatformDiscordLinkedRole>>("/api/admin/discord-linked-role", role));
}

export function savePlatformStatsSettings(settings: PlatformStatsSettings): Promise<AdminPlatformStatsResponse> {
  return unwrap(apiPut<Result<AdminPlatformStatsResponse>>("/api/admin/platform-stats", settings));
}

export function postPlatformStatsNow(): Promise<AdminPlatformStatsResponse> {
  return unwrap(apiPost<Result<AdminPlatformStatsResponse>>("/api/admin/platform-stats/post"));
}
