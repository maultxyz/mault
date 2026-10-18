import { apiGet, apiPut } from "@/lib/api/client";
import type {
  AdminPlatformDiscordChannelsResponse,
  AdminPlatformDiscordGuildResponse,
  PlatformDiscordChannelsSettings,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const platformDiscordChannelsQueryOptions = queryOptions({
  queryKey: ["admin", "discord-channels"] as const,
  queryFn: () =>
    apiGet<Result<AdminPlatformDiscordChannelsResponse>>(
      "/api/admin/discord-channels",
    ).then((r) => r.data ?? null),
});

export const platformDiscordGuildQueryOptions = (guildId: string | null) =>
  queryOptions({
    queryKey: ["admin", "discord-channels", "guild", guildId] as const,
    queryFn: () =>
      apiGet<Result<AdminPlatformDiscordGuildResponse>>(
        `/api/admin/discord-channels/guilds/${encodeURIComponent(guildId!)}`,
      ).then((r) => r.data ?? null),
    enabled: !!guildId,
  });

export function savePlatformDiscordChannels(
  settings: PlatformDiscordChannelsSettings,
): Promise<Result<AdminPlatformDiscordChannelsResponse>> {
  return apiPut("/api/admin/discord-channels", settings);
}
