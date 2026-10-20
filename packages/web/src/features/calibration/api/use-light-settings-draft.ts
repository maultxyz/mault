import {
  devicesQueryOptions,
  saveDevice,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { CALIBRATION_PREVIEW_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { Device } from "@/lib/interfaces/calibration";
import { lightSettingsSchema } from "@/schemas/light-settings.schema";
import {
  DEFAULT_LIGHT_BRIGHTNESS,
  DEFAULT_LIGHT_COLOR,
  DEFAULT_LIGHT_MODE,
  isFirmwareFeatureSupported,
  LIGHT_VALUE_COMMAND,
  toSetLightCommand,
  type LightSettings,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useLightSettingsDraft() {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const { activeOrg } = useOrg();
  const device = useDevice();
  const queryClient = useQueryClient();
  const { isReady, firmwareVersion, sendRequest } = useSerial();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = useMemo<LightSettings>(
    () => ({
      lightMode: device?.lightMode ?? DEFAULT_LIGHT_MODE,
      lightColor: device?.lightColor ?? DEFAULT_LIGHT_COLOR,
      lightBrightness: device?.lightBrightness ?? DEFAULT_LIGHT_BRIGHTNESS,
    }),
    [device?.lightMode, device?.lightColor, device?.lightBrightness],
  );

  const form = useForm<LightSettings>({
    resolver: zodResolver(lightSettingsSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const canControl =
    isReady && isFirmwareFeatureSupported(firmwareVersion, "lighting");

  const sendLights = useCallback(
    (settings: LightSettings, options?: { clearAlert?: boolean }) => {
      if (!canControl) return;
      void sendRequest(toSetLightCommand(settings, options));
    },
    [canControl, sendRequest],
  );

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(
      () => sendLights(form.getValues()),
      CALIBRATION_PREVIEW_DEBOUNCE_MS,
    );
  }, [sendLights, form]);

  useEffect(
    () => () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    },
    [],
  );

  const save = async (draft: LightSettings) => {
    if (!device?.guid) return;
    try {
      const result = await saveDevice(device.guid, draft);
      if (!result.success || !result.data) throw new Error(result.message);
      const savedDevice = result.data;
      queryClient.setQueryData(
        devicesQueryOptions(activeOrg?.id).queryKey,
        (old: Device[] | undefined) =>
          old?.map((d) => (d.guid === savedDevice.guid ? savedDevice : d)),
      );
      form.reset(draft);
      sendLights(draft);
      toast.success(t("lights.toasts.saved"));
    } catch {
      toast.error(t("lights.toasts.saveFailed"));
    }
  };

  const discard = () => {
    form.reset(values, DISCARD_RESET_OPTIONS);
    sendLights(values);
  };

  return {
    control: form.control,
    isLoaded: !!device?.guid,
    canControl,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    schedulePreview,
    testCelebration: () => {
      if (canControl) void sendRequest(LIGHT_VALUE_COMMAND);
    },
    clearAlert: () => sendLights(form.getValues(), { clearAlert: true }),
    save: () => void form.handleSubmit(save)(),
    discard,
  };
}
