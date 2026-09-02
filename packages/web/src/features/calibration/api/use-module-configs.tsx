import {
  modulesQueryOptions,
  saveModuleConfig,
} from "@/features/calibration/api/module-configs";
import type { ModuleConfigsContextValue } from "@/features/calibration/types";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  CHANNEL_OFFSET,
  DEFAULT_CALIBRATION,
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  ModuleConfig,
  ServoCalibration,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const ModuleConfigsContext = createContext<ModuleConfigsContextValue | null>(
  null,
);

function defaultConfigs(): ModuleConfig[] {
  return Array.from({ length: DEFAULT_MODULE_COUNT }, (_, i) => ({
    moduleNumber: i + 1,
    calibration: { ...DEFAULT_CALIBRATION },
  }));
}

export function ModuleConfigsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("calibration");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const { sendCommand, receiveResponse, registerPreTestHook } = useSerial();

  const { data: configs = defaultConfigs() } = useQuery({
    ...modulesQueryOptions,
    enabled: !!activeOrg,
  });

  useEffect(() => {
    return registerPreTestHook(async () => {
      try {
        const orgSettings = await queryClient.fetchQuery(
          orgSettingsQueryOptions(activeOrg?.id),
        );
        const channelLayout =
          orgSettings?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
        const offsetResponse = receiveResponse();
        await sendCommand(
          JSON.stringify({ setChannelOffset: CHANNEL_OFFSET[channelLayout] }),
        );
        await offsetResponse;
      } catch (e) {
        console.error("[Serial] Failed to sync channel offset:", e); // eslint-disable-line no-console -- hardware debug trace
      }

      const fresh = await queryClient.fetchQuery(modulesQueryOptions);
      for (const config of fresh) {
        const p = receiveResponse();
        await sendCommand(
          JSON.stringify({
            setConfig: { module: config.moduleNumber, ...config.calibration },
          }),
        );
        const response = await p;
        try {
          const parsed = response ? JSON.parse(response) : null;
          if (parsed?.error) {
            toast.error(
              t("useModuleConfigs.toasts.notSynced", {
                module: config.moduleNumber,
              }),
              { description: String(parsed.error) },
            );
          }
        } catch {
          toast.error(
            t("useModuleConfigs.toasts.notSynced", {
              module: config.moduleNumber,
            }),
            {
              description: response
                ? t("useModuleConfigs.toasts.unexpectedResponse", { response })
                : t("useModuleConfigs.toasts.noResponse"),
            },
          );
        }
      }
    });
  }, [
    registerPreTestHook,
    queryClient,
    sendCommand,
    receiveResponse,
    activeOrg,
    t,
  ]);

  const saveConfigMutation = useMutation({
    mutationFn: ({
      moduleNumber,
      calibration,
    }: {
      moduleNumber: number;
      calibration: ServoCalibration;
    }) => saveModuleConfig(moduleNumber, calibration),
    onMutate: async ({ moduleNumber, calibration }) => {
      await queryClient.cancelQueries({ queryKey: ["modules"] });
      const previous = queryClient.getQueryData<ModuleConfig[]>(["modules"]);
      queryClient.setQueryData<ModuleConfig[]>(
        ["modules"],
        (old = defaultConfigs()) =>
          old.map((c) =>
            c.moduleNumber === moduleNumber ? { ...c, calibration } : c,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["modules"], context.previous);
      toast.error(t("useModuleConfigs.toasts.saveFailed"));
    },
    onSuccess: (result, { moduleNumber, calibration }) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["modules"], result.data);
        sendCommand(
          JSON.stringify({
            setConfig: { module: moduleNumber, ...calibration },
          }),
        );
      }
    },
  });

  const saveConfig = useCallback(
    async (moduleNumber: number, calibration: ServoCalibration) => {
      await saveConfigMutation.mutateAsync({ moduleNumber, calibration });
    },
    [saveConfigMutation],
  );

  const moveServo = useCallback(
    (module: number, servo: "bottom" | "paddle" | "pusher", value: number) => {
      sendCommand(JSON.stringify({ servo, module, value }));
    },
    [sendCommand],
  );

  return (
    <ModuleConfigsContext value={{ configs, saveConfig, moveServo }}>
      {children}
    </ModuleConfigsContext>
  );
}

export function useModuleConfigs() {
  const context = useContext(ModuleConfigsContext);
  if (!context) {
    throw new Error(
      "useModuleConfigs must be used within a ModuleConfigsProvider",
    );
  }
  return context;
}
