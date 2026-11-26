import { useOrg } from "@/features/companies/api/use-organization";
import { useAppStreamSource } from "@/lib/app-stream";
import type { RaspberryPiList, RaspberryPiScanRequest } from "@/lib/interfaces/raspberry-pis";
import { toast } from "@/lib/toast";
import {
  applyPiHostStatusEvent,
  PI_HOST_STATUS_EVENT,
  type PiHostClaimFormValues,
  type PiHostStatusEvent,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  claimRaspberryPi,
  raspberryPisQueryOptions,
  removeRaspberryPi,
  renameRaspberryPi,
  runRaspberryPiScanAction,
  updateRaspberryPiScanSettings,
  startRaspberryPiScan,
  stopRaspberryPiScan,
} from "./raspberry-pis";

function useRaspberryPisQueryOptions() {
  const { activeOrg } = useOrg();
  return raspberryPisQueryOptions(activeOrg?.id);
}

export function useLiveRaspberryPiList(enabled = true) {
  const queryClient = useQueryClient();
  const options = useRaspberryPisQueryOptions();
  const query = useQuery({ ...options, enabled: options.enabled !== false && enabled });
  const eventSource = useAppStreamSource();
  const orgId = options.queryKey[1];

  useEffect(() => {
    if (!eventSource || !enabled) return;
    const queryKey = raspberryPisQueryOptions(orgId).queryKey;
    const applyStatus = (message: Event) => {
      const event = JSON.parse((message as MessageEvent).data) as PiHostStatusEvent;
      queryClient.setQueryData<RaspberryPiList>(queryKey, (current) =>
        current ? { ...current, hosts: applyPiHostStatusEvent(current.hosts, event) } : current,
      );
    };
    eventSource.addEventListener(PI_HOST_STATUS_EVENT, applyStatus);
    return () => eventSource.removeEventListener(PI_HOST_STATUS_EVENT, applyStatus);
  }, [eventSource, orgId, queryClient, enabled]);

  return query;
}

export function useRaspberryPis() {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();
  const options = useRaspberryPisQueryOptions();
  const { data, isLoading, isError, refetch } = useLiveRaspberryPiList();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: options.queryKey });

  const claim = useMutation({
    mutationFn: async (values: PiHostClaimFormValues) => {
      const result = await claimRaspberryPi(values);
      if (!result.success) throw new Error(result.message || t("raspberryPis.linkFailed"));
    },
    onSuccess: () => {
      toast.success(t("raspberryPis.linked"));
      return invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (guid: string) => {
      const result = await removeRaspberryPi(guid);
      if (!result.success) throw new Error(result.message || t("raspberryPis.removeFailed"));
    },
    onSuccess: () => {
      toast.success(t("raspberryPis.removed"));
      return invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rename = useMutation({
    mutationFn: async ({ guid, name }: { guid: string; name: string }) => {
      const result = await renameRaspberryPi(guid, name);
      if (!result.success) throw new Error(result.message || t("raspberryPis.renameFailed"));
    },
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  return {
    rename,
    hosts: data?.hosts ?? [],
    canManage: data?.canManage ?? false,
    isLoading,
    isError,
    refetch,
    claim,
    remove,
  };
}

export function useRaspberryPiScan(hostGuid: string) {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();
  const options = useRaspberryPisQueryOptions();

  return useMutation({
    mutationFn: async (request: RaspberryPiScanRequest) => {
      const result =
        request.kind === "start"
          ? await startRaspberryPiScan(hostGuid, request.body)
          : request.kind === "settings"
            ? await updateRaspberryPiScanSettings(hostGuid, request.body)
            : request.kind === "stop"
              ? await stopRaspberryPiScan(hostGuid)
              : await runRaspberryPiScanAction(hostGuid, request.action);
      if (!result.success) throw new Error(result.message || t("raspberryPis.scanFailed"));
      return result.data ?? null;
    },
    onSuccess: (scanState) => {
      if (!scanState) return;
      queryClient.setQueryData<RaspberryPiList>(options.queryKey, (current) =>
        current
          ? {
              ...current,
              hosts: current.hosts.map((host) =>
                host.guid === hostGuid ? { ...host, scanState } : host,
              ),
            }
          : current,
      );
    },
    onError: (error) => toast.error(error.message),
  });
}
