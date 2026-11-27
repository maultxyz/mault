import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { PiHostClaimFormValues } from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { useActiveOrgId } from "@/hooks/use-org";
import type { RaspberryPiList, RaspberryPiScanOptions, RaspberryPiScanRequest } from "@/lib/interfaces/raspberry-pis";
import {
  claimRaspberryPi,
  raspberryPisQueryOptions,
  removeRaspberryPi,
  renameRaspberryPi,
  runRaspberryPiScanAction,
  updateRaspberryPiScanSettings,
  startRaspberryPiScan,
  stopRaspberryPiScan,
  updateRaspberryPi,
} from "./raspberry-pis";

export function useRaspberryPis() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const options = raspberryPisQueryOptions(useActiveOrgId());
  const query = useQuery(options);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: options.queryKey });

  const claim = useMutation({
    mutationFn: async (values: PiHostClaimFormValues) => {
      const result = await claimRaspberryPi(values);
      if (!result.success) throw new Error(result.message || t("settings.raspberryPis.linkFailed"));
    },
    onSuccess: () => {
      showToast({ message: t("settings.raspberryPis.linked"), tone: "success" });
      return invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (guid: string) => {
      const result = await removeRaspberryPi(guid);
      if (!result.success) throw new Error(result.message || t("settings.raspberryPis.removeFailed"));
    },
    onSuccess: () => {
      showToast({ message: t("settings.raspberryPis.removed"), tone: "success" });
      return invalidate();
    },
    onError: (error) => showToast({ message: error.message, tone: "destructive" }),
  });

  const rename = useMutation({
    mutationFn: async ({ guid, name }: { guid: string; name: string }) => {
      const result = await renameRaspberryPi(guid, name);
      if (!result.success) throw new Error(result.message || t("settings.raspberryPis.renameFailed"));
    },
    onSuccess: invalidate,
  });

  return { query, claim, remove, rename };
}

export function useRaspberryPiScan(hostGuid: string, { reportsErrorsInline = false }: RaspberryPiScanOptions = {}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const options = raspberryPisQueryOptions(useActiveOrgId());

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
      if (!result.success) throw new Error(result.message || t("settings.raspberryPis.scanFailed"));
      return result.data ?? null;
    },
    onSuccess: (scanState) => {
      if (!scanState) return;
      queryClient.setQueryData<RaspberryPiList>(options.queryKey, (current) =>
        current
          ? {
              ...current,
              hosts: current.hosts.map((host) => (host.guid === hostGuid ? { ...host, scanState } : host)),
            }
          : current,
      );
    },
    onError: (error) => {
      if (!reportsErrorsInline) showToast({ message: error.message, tone: "destructive" });
    },
  });
}

export function useRaspberryPiUpdate(hostGuid: string) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const options = raspberryPisQueryOptions(useActiveOrgId());

  return useMutation({
    mutationFn: async () => {
      const result = await updateRaspberryPi(hostGuid);
      if (!result.success) throw new Error(result.message || t("settings.raspberryPis.update.failedToStart"));
    },
    onSuccess: () => {
      showToast({ message: t("settings.raspberryPis.update.started"), tone: "success" });
      queryClient.setQueryData<RaspberryPiList>(options.queryKey, (current) =>
        current
          ? {
              ...current,
              hosts: current.hosts.map((host) =>
                host.guid === hostGuid && host.update
                  ? { ...host, update: { ...host.update, state: { phase: "running", startedAt: Date.now(), message: null } } }
                  : host,
              ),
            }
          : current,
      );
    },
    onError: (error) => showToast({ message: error.message, tone: "destructive" }),
  });
}
