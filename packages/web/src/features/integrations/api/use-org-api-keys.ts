import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type { OrgApiKeyInput } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createOrgApiKey,
  orgApiKeysQueryOptions,
  revokeOrgApiKey,
} from "./api-keys";

export function useOrgApiKeys() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const keysOptions = orgApiKeysQueryOptions(activeOrg?.id);
  const { data, isLoading, isError } = useQuery(keysOptions);
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: keysOptions.queryKey });

  const create = useMutation({
    mutationFn: async (input: OrgApiKeyInput) => {
      const result = await createOrgApiKey(input);
      if (!result.success || !result.data) {
        throw new Error(result.message || t("apiKeys.createFailed"));
      }
      return result.data;
    },
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });

  const revoke = useMutation({
    mutationFn: async (guid: string) => {
      const result = await revokeOrgApiKey(guid);
      if (!result.success) {
        throw new Error(result.message || t("apiKeys.revokeFailed"));
      }
    },
    onSuccess: () => {
      toast.success(t("apiKeys.revoked"));
      return invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return {
    keys: data?.keys ?? [],
    canManage: data?.canManage ?? false,
    isLocked: billing?.apiAccess === false,
    isLoading,
    isError,
    create,
    revoke,
  };
}
