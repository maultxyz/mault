import { toast } from "@/lib/toast";
import type { SyncApiKeyInput } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createSyncApiKey,
  revokeSyncApiKey,
  syncApiKeysQueryOptions,
} from "./sync-api-keys";

export function useSyncApiKeys() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(syncApiKeysQueryOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: syncApiKeysQueryOptions.queryKey,
    });

  const create = useMutation({
    mutationFn: async (input: SyncApiKeyInput) => {
      const result = await createSyncApiKey(input);
      if (!result.success || !result.data) {
        throw new Error(result.message || t("syncApiKeys.createFailed"));
      }
      return result.data;
    },
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });

  const revoke = useMutation({
    mutationFn: async (guid: string) => {
      const result = await revokeSyncApiKey(guid);
      if (!result.success) {
        throw new Error(result.message || t("syncApiKeys.revokeFailed"));
      }
    },
    onSuccess: () => {
      toast.success(t("syncApiKeys.revoked"));
      return invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return { keys: data ?? [], isLoading, isError, create, revoke };
}
