import {
  feederQueryOptions,
  saveFeederConfig,
} from "@/features/calibration/api/feeder-config";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  DEFAULT_FEEDER_CALIBRATION,
  type FeederCalibration,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface FeederConfigContextValue {
  feederConfig: FeederCalibration;
  saveConfig: (calibration: FeederCalibration) => Promise<void>;
  previewSpeed: (value: number) => void;
}

const FeederConfigContext = createContext<FeederConfigContextValue | null>(null);

export function FeederConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("calibration");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const { sendCommand, receiveResponse, registerPreTestHook } = useSerial();

  const { data: feederConfig = { ...DEFAULT_FEEDER_CALIBRATION } } =
    useQuery({ ...feederQueryOptions, enabled: !!activeOrg });

  useEffect(() => {
    return registerPreTestHook(async () => {
      const fresh = await queryClient.fetchQuery(feederQueryOptions);
      const p = receiveResponse();
      await sendCommand(JSON.stringify({ setFeederConfig: fresh }));
      const response = await p;
      try {
        const parsed = response ? JSON.parse(response) : null;
        if (parsed?.error) {
          toast.error(t("useFeederConfig.toasts.notSynced"), {
            description: String(parsed.error),
          });
        }
      } catch {
        toast.error(t("useFeederConfig.toasts.notSynced"), {
          description: response
            ? t("useFeederConfig.toasts.unexpectedResponse", { response })
            : t("useFeederConfig.toasts.noResponse"),
        });
      }
    });
  }, [registerPreTestHook, queryClient, sendCommand, receiveResponse, t]);

  const saveConfigMutation = useMutation({
    mutationFn: (calibration: FeederCalibration) =>
      saveFeederConfig(calibration),
    onMutate: async (calibration) => {
      await queryClient.cancelQueries({ queryKey: ["feeder"] });
      const previous = queryClient.getQueryData<FeederCalibration>(["feeder"]);
      queryClient.setQueryData<FeederCalibration>(["feeder"], calibration);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["feeder"], context.previous);
      toast.error(t("useFeederConfig.toasts.saveFailed"));
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(["feeder"], result.data);
        sendCommand(JSON.stringify({ setFeederConfig: result.data }));
      }
    },
  });

  const saveConfig = useCallback(
    async (calibration: FeederCalibration) => {
      await saveConfigMutation.mutateAsync(calibration);
    },
    [saveConfigMutation],
  );

  const previewSpeed = useCallback(
    (value: number) => {
      sendCommand(JSON.stringify({ feederValue: value }));
    },
    [sendCommand],
  );

  return (
    <FeederConfigContext value={{ feederConfig, saveConfig, previewSpeed }}>
      {children}
    </FeederConfigContext>
  );
}

export function useFeederConfig() {
  const context = useContext(FeederConfigContext);
  if (!context) {
    throw new Error("useFeederConfig must be used within a FeederConfigProvider");
  }
  return context;
}
