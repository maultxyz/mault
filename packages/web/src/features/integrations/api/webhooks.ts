import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CreatedWebhookEndpoint,
  Result,
  WebhookEndpoint,
  WebhookEndpointInput,
  WebhookEndpointList,
  WebhookTestResult,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const webhooksQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: ["webhooks", orgId] as const,
    queryFn: () =>
      apiGet<Result<WebhookEndpointList>>("/api/webhooks").then(
        (r) => r.data ?? { endpoints: [], canManage: false },
      ),
    enabled: !!orgId,
  });

export function createWebhook(
  input: WebhookEndpointInput,
): Promise<Result<CreatedWebhookEndpoint>> {
  return apiPost<Result<CreatedWebhookEndpoint>>("/api/webhooks", input);
}

export function updateWebhook(
  guid: string,
  input: WebhookEndpointInput,
): Promise<Result<WebhookEndpoint>> {
  return apiPut<Result<WebhookEndpoint>>(`/api/webhooks/${guid}`, input);
}

export function enableWebhook(guid: string): Promise<Result<WebhookEndpoint>> {
  return apiPost<Result<WebhookEndpoint>>(`/api/webhooks/${guid}/enable`, {});
}

export function testWebhook(guid: string): Promise<Result<WebhookTestResult>> {
  return apiPost<Result<WebhookTestResult>>(`/api/webhooks/${guid}/test`, {});
}

export function deleteWebhook(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/webhooks/${guid}`);
}
