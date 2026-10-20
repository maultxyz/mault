import { apiGet, apiPut } from "@/lib/api/client";
import type { PlatformDiscordLinkedRole, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const platformDiscordLinkedRoleQueryOptions = queryOptions({
  queryKey: ["admin", "discord-linked-role"] as const,
  queryFn: () =>
    apiGet<Result<PlatformDiscordLinkedRole>>(
      "/api/admin/discord-linked-role",
    ).then((r) => r.data ?? null),
});

export function savePlatformDiscordLinkedRole(
  role: PlatformDiscordLinkedRole,
): Promise<Result<PlatformDiscordLinkedRole>> {
  return apiPut("/api/admin/discord-linked-role", role);
}
