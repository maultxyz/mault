import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  DiscordChannelInput,
  DiscordIntegration,
  NotificationRule,
  NotificationRuleInput,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const discordIntegrationQueryOptions = (
  orgId: string | undefined,
  isLinked: boolean,
) =>
  queryOptions({
    queryKey: ["discord-integration", orgId, isLinked] as const,
    queryFn: () =>
      apiGet<Result<DiscordIntegration>>("/api/integrations/discord").then(
        (r) => r.data ?? null,
      ),
    enabled: !!orgId,
  });

export const notificationRulesQueryOptions = (
  orgId: string | undefined,
  gameGuid: string | undefined,
) =>
  queryOptions({
    queryKey: ["notification-rules", orgId, gameGuid] as const,
    queryFn: () =>
      apiGet<Result<NotificationRule[]>>(
        `/api/integrations/discord/rules?gameGuid=${encodeURIComponent(gameGuid!)}`,
      ).then((r) => r.data ?? []),
    enabled: !!orgId && !!gameGuid,
    staleTime: Infinity,
  });

export function addNotificationRule(
  gameGuid: string,
  input: NotificationRuleInput,
): Promise<Result<NotificationRule[]>> {
  return apiPost<Result<NotificationRule[]>>(
    "/api/integrations/discord/rules",
    { ...input, gameGuid },
  );
}

export function updateNotificationRule(
  guid: string,
  input: NotificationRuleInput,
): Promise<Result<NotificationRule[]>> {
  return apiPut<Result<NotificationRule[]>>(
    `/api/integrations/discord/rules/${guid}`,
    input,
  );
}

export function deleteNotificationRule(
  guid: string,
): Promise<Result<NotificationRule[]>> {
  return apiDelete<Result<NotificationRule[]>>(
    `/api/integrations/discord/rules/${guid}`,
  );
}

export function setDiscordChannel(
  input: DiscordChannelInput,
): Promise<Result<null>> {
  return apiPut<Result<null>>("/api/integrations/discord/channels", input);
}
