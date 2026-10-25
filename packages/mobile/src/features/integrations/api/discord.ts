import { queryOptions } from "@tanstack/react-query";
import type {
  DiscordChannelInput,
  DiscordIntegration,
  NotificationRule,
  NotificationRuleInput,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, apiRequest, unwrap, unwrapOr } from "@/lib/api/client";
import type { DiscordLinkCode, NotificationTestOutcome, NotificationTestType } from "@/lib/interfaces/integrations";

export const discordIntegrationQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["discord-integration", orgId] as const,
    queryFn: () => unwrapOr(apiGet<Result<DiscordIntegration>>("/api/integrations/discord"), null),
    enabled: !!orgId,
  });

export const notificationRulesQueryOptions = (orgId: string | null, gameGuid: string | undefined) =>
  queryOptions({
    queryKey: ["notification-rules", orgId, gameGuid] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<NotificationRule[]>>(
          `/api/integrations/discord/rules?gameGuid=${encodeURIComponent(gameGuid ?? "")}`,
        ),
        [],
      ),
    enabled: !!orgId && !!gameGuid,
  });

export function addNotificationRule(gameGuid: string, input: NotificationRuleInput): Promise<NotificationRule[]> {
  return unwrap(apiPost<Result<NotificationRule[]>>("/api/integrations/discord/rules", { ...input, gameGuid }));
}

export function updateNotificationRule(guid: string, input: NotificationRuleInput): Promise<NotificationRule[]> {
  return unwrap(apiPut<Result<NotificationRule[]>>(`/api/integrations/discord/rules/${guid}`, input));
}

export function deleteNotificationRule(guid: string): Promise<NotificationRule[]> {
  return unwrap(apiDelete<Result<NotificationRule[]>>(`/api/integrations/discord/rules/${guid}`));
}

export async function setDiscordChannel(input: DiscordChannelInput): Promise<void> {
  const result = await apiPut<Result<null>>("/api/integrations/discord/channels", input);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}

export function generateDiscordLinkCode(): Promise<DiscordLinkCode> {
  return unwrap(apiPost<Result<DiscordLinkCode>>("/api/org-settings/discord-link-code"));
}

export async function unlinkDiscord(): Promise<void> {
  const result = await apiPost<Result<null>>("/api/org-settings/discord-unlink");
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}

export async function sendTestNotification(type: NotificationTestType): Promise<NotificationTestOutcome> {
  const body = await apiRequest<{ success?: boolean; reason?: NotificationTestOutcome }>("/api/notifications/test", {
    method: "POST",
    body: { type },
    acceptStatuses: [409, 502],
  });
  return body.reason ?? "sent";
}
