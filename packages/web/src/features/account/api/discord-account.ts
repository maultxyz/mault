import { apiGet, apiPost } from "@/lib/api/client";
import type {
  DiscordAccountLink,
  DiscordAccountLinkCode,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export function getDiscordAccountLink(): Promise<{
  success: boolean;
  data?: DiscordAccountLink | null;
}> {
  return apiGet("/api/me/discord");
}

export function generateDiscordAccountLinkCode(): Promise<{
  success: boolean;
  message?: string;
  data?: DiscordAccountLinkCode;
}> {
  return apiPost("/api/me/discord/link-code");
}

export function unlinkDiscordAccount(): Promise<{
  success: boolean;
  message?: string;
}> {
  return apiPost("/api/me/discord/unlink");
}

export const discordAccountLinkQueryOptions = () =>
  queryOptions({
    queryKey: ["me", "discord"],
    queryFn: () => getDiscordAccountLink().then((r) => r.data ?? null),
  });
