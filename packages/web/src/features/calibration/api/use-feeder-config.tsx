import {
  feederQueryOptions,
  saveFeederConfig,
} from "@/features/calibration/api/feeder-config";
import { useDevice } from "@/features/calibration/api/use-device";
import { useSerial } from "@/features/scanner/api/use-serial";
import { FEEDER_PREVIEW_STOP_MS } from "@/lib/constants/timing";
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
  useRef,
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
  const device = useDevice();
  const { sendCommand, receiveResponse, registerPreTestHook } = useSerial();

  const queryOpts = feederQueryOptions(device?.guid);
  const { data: feederConfig = { ...DEFAULT_FEEDER_CALIBRATION } } =
    useQuery(queryOpts);

  useEffect(() => {
    return registerPreTestHook(async (target) => {
      if (!target) return;
      const fresh = await queryClient.fetchQuery(feederQueryOptions(target.guid));
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
            ? t("toasts.unexpectedResponse", { response })
            : t("toasts.noResponse"),
        });
      }
    });
  }, [registerPreTestHook, queryClient, sendCommand, receiveResponse, t]);

  const saveConfigMutation = useMutation({
    mutationFn: (calibration: FeederCalibration) =>
      saveFeederConfig(device!.guid, calibration),
    onMutate: async (calibration) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData<FeederCalibration>(
        queryOpts.queryKey,
      );
      queryClient.setQueryData<FeederCalibration>(
        queryOpts.queryKey,
        calibration,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryOpts.queryKey, context.previous);
      toast.error(t("useFeederConfig.toasts.saveFailed"));
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
        sendCommand(JSON.stringify({ setFeederConfig: result.data }));
      }
    },
  });

  const saveConfig = useCallback(
    async (calibration: FeederCalibration) => {
      if (!device) return;
      await saveConfigMutation.mutateAsync(calibration);
    },
    [saveConfigMutation, device],
  );

  const previewStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const previewSpeed = useCallback(
    (value: number) => {
      sendCommand(JSON.stringify({ feederValue: value }));
      if (previewStopTimeoutRef.current) {
        clearTimeout(previewStopTimeoutRef.current);
      }
      previewStopTimeoutRef.current = setTimeout(() => {
        sendCommand(JSON.stringify({ feederStop: true }));
      }, FEEDER_PREVIEW_STOP_MS);
    },
    [sendCommand],
  );

  useEffect(() => {
    return () => {
      if (previewStopTimeoutRef.current) {
        clearTimeout(previewStopTimeoutRef.current);
      }
    };
  }, []);

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
