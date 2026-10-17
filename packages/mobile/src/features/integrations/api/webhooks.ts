import { queryOptions } from "@tanstack/react-query";
import type {
  CreatedWebhookEndpoint,
  Result,
  WebhookEndpoint,
  WebhookEndpointInput,
  WebhookEndpointList,
  WebhookTestResult,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap } from "@/lib/api/client";

export const webhooksQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["webhooks", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<WebhookEndpointList>>("/api/webhooks")),
    enabled: !!orgId,
  });

export function createWebhook(input: WebhookEndpointInput): Promise<CreatedWebhookEndpoint> {
  return unwrap(apiPost<Result<CreatedWebhookEndpoint>>("/api/webhooks", input));
}

export function updateWebhook(guid: string, input: WebhookEndpointInput): Promise<WebhookEndpoint> {
  return unwrap(apiPut<Result<WebhookEndpoint>>(`/api/webhooks/${guid}`, input));
}

export function enableWebhook(guid: string): Promise<WebhookEndpoint> {
  return unwrap(apiPost<Result<WebhookEndpoint>>(`/api/webhooks/${guid}/enable`, {}));
}

export function testWebhook(guid: string): Promise<WebhookTestResult> {
  return unwrap(apiPost<Result<WebhookTestResult>>(`/api/webhooks/${guid}/test`, {}));
}

export async function deleteWebhook(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/webhooks/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
