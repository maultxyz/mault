import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type { Result, WebhookEndpointInput } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createWebhook,
  deleteWebhook,
  enableWebhook,
  testWebhook,
  updateWebhook,
  webhooksQueryOptions,
} from "./webhooks";

function unwrap<T>(result: Result<T>, fallback: string): T {
  if (!result.success || result.data === undefined) {
    throw new Error(result.message || fallback);
  }
  return result.data;
}

export function useWebhooks() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const listOptions = webhooksQueryOptions(activeOrg?.id);
  const { data, isLoading, isError } = useQuery(listOptions);
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });
  const onError = (err: Error) => toast.error(err.message);

  const create = useMutation({
    mutationFn: async (input: WebhookEndpointInput) =>
      unwrap(await createWebhook(input), t("webhooks.saveFailed")),
    onSuccess: invalidate,
    onError,
  });

  const update = useMutation({
    mutationFn: async ({
      guid,
      input,
    }: {
      guid: string;
      input: WebhookEndpointInput;
    }) => unwrap(await updateWebhook(guid, input), t("webhooks.saveFailed")),
    onSuccess: () => {
      toast.success(t("webhooks.saved"));
      return invalidate();
    },
    onError,
  });

  const enable = useMutation({
    mutationFn: async (guid: string) =>
      unwrap(await enableWebhook(guid), t("webhooks.enableFailed")),
    onSuccess: () => {
      toast.success(t("webhooks.enabled"));
      return invalidate();
    },
    onError,
  });

  const test = useMutation({
    mutationFn: async (guid: string) =>
      unwrap(await testWebhook(guid), t("webhooks.testFailed")),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t("webhooks.testSucceeded", { status: result.status }));
      } else {
        toast.error(
          t("webhooks.testRejected", {
            error: result.error ?? t("webhooks.unknownError"),
          }),
        );
      }
      return invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (guid: string) => {
      const result = await deleteWebhook(guid);
      if (!result.success) {
        throw new Error(result.message || t("webhooks.deleteFailed"));
      }
    },
    onSuccess: () => {
      toast.success(t("webhooks.deleted"));
      return invalidate();
    },
    onError,
  });

  return {
    endpoints: data?.endpoints ?? [],
    canManage: data?.canManage ?? false,
    isLocked: billing?.apiAccess === false,
    isLoading,
    isError,
    create,
    update,
    enable,
    test,
    remove,
  };
}
