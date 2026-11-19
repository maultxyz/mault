import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type {
  Result,
  StatsSyncConnectInput,
  StatsSyncConnectionStatus,
  StatsSyncKeyStatus,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  connectStatsSync,
  disconnectStatsSync,
  generateStatsSyncKey,
  revokeStatsSyncKey,
  runStatsSyncNow,
  statsSyncConnectionQueryOptions,
  statsSyncKeyQueryOptions,
} from "./stats-sync";

function dataOrThrow<T>(result: Result<T>, fallbackMessage: string): T {
  if (!result.success || !result.data) {
    throw new Error(result.message || fallbackMessage);
  }
  return result.data;
}

export function useStatsSyncKey() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const keyOptions = statsSyncKeyQueryOptions(activeOrg?.id);
  const query = useQuery(keyOptions);
  const setStatus = (status: StatsSyncKeyStatus) =>
    queryClient.setQueryData(keyOptions.queryKey, status);

  const generate = useMutation({
    mutationFn: async () =>
      dataOrThrow(
        await generateStatsSyncKey(),
        t("statsSync.key.generateFailed"),
      ),
    onSuccess: (created) => setStatus(created.status),
    onError: (err) => toast.error(err.message),
  });

  const revoke = useMutation({
    mutationFn: async () =>
      dataOrThrow(await revokeStatsSyncKey(), t("statsSync.key.revokeFailed")),
    onSuccess: (status) => {
      setStatus(status);
      toast.success(t("statsSync.key.revoked"));
    },
    onError: (err) => toast.error(err.message),
  });

  return { ...query, generate, revoke };
}

export function useStatsSyncConnection() {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const connectionOptions = statsSyncConnectionQueryOptions(activeOrg?.id);
  const query = useQuery(connectionOptions);
  const setStatus = (status: StatsSyncConnectionStatus) =>
    queryClient.setQueryData(connectionOptions.queryKey, status);

  const connect = useMutation({
    mutationFn: async (input: StatsSyncConnectInput) =>
      dataOrThrow(
        await connectStatsSync(input),
        t("statsSync.connection.connectFailed"),
      ),
    onSuccess: setStatus,
  });

  const syncNow = useMutation({
    mutationFn: async () =>
      dataOrThrow(await runStatsSyncNow(), t("statsSync.connection.syncFailed")),
    onSuccess: setStatus,
    onError: (err) => toast.error(err.message),
  });

  const disconnect = useMutation({
    mutationFn: async () =>
      dataOrThrow(
        await disconnectStatsSync(),
        t("statsSync.connection.disconnectFailed"),
      ),
    onSuccess: (status) => {
      setStatus(status);
      toast.success(t("statsSync.connection.disconnected"));
    },
    onError: (err) => toast.error(err.message),
  });

  return { ...query, connect, syncNow, disconnect };
}
