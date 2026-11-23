import type { DiscordAccountLink, DiscordAccountLinkCode, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, unwrap, unwrapOr } from "@/lib/api/client";
import { DISCORD_ACCOUNT_LINK_QUERY_KEY } from "@/lib/constants/account";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const discordAccountLinkQueryOptions = () =>
  queryOptions({
    queryKey: DISCORD_ACCOUNT_LINK_QUERY_KEY,
    queryFn: () => unwrapOr(apiGet<Result<DiscordAccountLink | null>>("/api/me/discord"), null),
    staleTime: QUERY_STALE_MS,
  });

export function generateDiscordAccountLinkCode(): Promise<DiscordAccountLinkCode> {
  return unwrap(apiPost<Result<DiscordAccountLinkCode>>("/api/me/discord/link-code"));
}

export function unlinkDiscordAccount(): Promise<null> {
  return unwrapOr(apiPost<Result<null>>("/api/me/discord/unlink"), null);
}
