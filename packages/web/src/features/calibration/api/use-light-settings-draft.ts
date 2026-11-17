import {
  devicesQueryOptions,
  saveDevice,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { usePriceSource } from "@/hooks/use-price-source";
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
  DEFAULT_LIGHT_WHITE,
  DEFAULT_LIGHT_LED_COUNT,
  DEFAULT_VALUE_CELEBRATION_DURATION_MS,
  DEFAULT_LIGHT_WARNING_SECONDS,
  DEFAULT_LIGHT_NORMAL_SECONDS,
  assertLightWarningReply,
  assertLightLedCountReply,
  confirmedValueCelebrationDuration,
  isFirmwareFeatureSupported,
  toValueCelebrationCommand,
  toSetLightCommand,
  type LightingDraft,
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
  const { source } = usePriceSource();
  const queryClient = useQueryClient();
  const { isReady, firmwareVersion, sendRequest } = useSerial();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = useMemo<LightingDraft>(
    () => ({
      lightMode: device?.lightMode ?? DEFAULT_LIGHT_MODE,
      lightColor: device?.lightColor ?? DEFAULT_LIGHT_COLOR,
      lightBrightness: device?.lightBrightness ?? DEFAULT_LIGHT_BRIGHTNESS,
      lightWhite: device?.lightWhite ?? DEFAULT_LIGHT_WHITE,
      lightLedCount: device?.lightLedCount ?? DEFAULT_LIGHT_LED_COUNT,
      valueCelebrationEnabled: device?.valueCelebrationEnabled ?? false,
      valueCelebrationThreshold: device?.valueCelebrationThreshold ?? 0,
      valueCelebrationPriceSource: source,
      valueCelebrationDurationMs: device?.valueCelebrationDurationMs ?? DEFAULT_VALUE_CELEBRATION_DURATION_MS,
      lightWarningsEnabled: device?.lightWarningsEnabled ?? true,
      lightEmptyWarningSeconds: device?.lightEmptyWarningSeconds ?? DEFAULT_LIGHT_WARNING_SECONDS,
      lightBlockedWarningSeconds: device?.lightBlockedWarningSeconds ?? DEFAULT_LIGHT_WARNING_SECONDS,
      lightNormalSeconds: device?.lightNormalSeconds ?? DEFAULT_LIGHT_NORMAL_SECONDS,
    }),
    [device?.lightMode, device?.lightColor, device?.lightBrightness, device?.lightWhite, device?.lightLedCount,
      device?.valueCelebrationEnabled, device?.valueCelebrationThreshold, device?.valueCelebrationDurationMs,
      device?.lightWarningsEnabled, device?.lightEmptyWarningSeconds, device?.lightBlockedWarningSeconds, device?.lightNormalSeconds, source],
  );

  const form = useForm<LightingDraft>({
    resolver: zodResolver(lightSettingsSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const canControl =
    isReady && isFirmwareFeatureSupported(firmwareVersion, "lighting");

  const sendLights = useCallback(
    async (settings: LightingDraft, options?: { clearAlert?: boolean }) => {
      if (!canControl) return;
      const warningsSupported = isFirmwareFeatureSupported(firmwareVersion, "lightingWarnings");
      const rgbwSupported = isFirmwareFeatureSupported(firmwareVersion, "rgbwLighting");
      const configurableLightingSupported = isFirmwareFeatureSupported(firmwareVersion, "configurableLighting");
      const { sent, line } = await sendRequest(toSetLightCommand(settings, { ...options, warningsSupported, rgbwSupported, configurableLightingSupported }));
      if (!sent || !line) throw new Error("Lighting acknowledgement missing");
      if (warningsSupported) assertLightWarningReply(line, settings);
      if (configurableLightingSupported) assertLightLedCountReply(line, settings.lightLedCount);
    },
    [canControl, sendRequest, firmwareVersion],
  );

  const previewLights = useCallback((settings: LightingDraft, options?: { clearAlert?: boolean }) => {
    void sendLights(settings, options).catch((cause: unknown) => {
      console.error("Lighting preview failed:", cause);
      toast.error(t("lights.toasts.previewFailed"));
    });
  }, [sendLights, toast, t]);

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(
      () => {
        const draft = lightSettingsSchema.safeParse(form.getValues());
        if (draft.success) previewLights(draft.data);
      },
      CALIBRATION_PREVIEW_DEBOUNCE_MS,
    );
  }, [previewLights, form]);

  useEffect(
    () => () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    },
    [],
  );

  const save = async (draft: LightingDraft) => {
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
      previewLights(draft);
      toast.success(t("lights.toasts.saved"));
    } catch {
      toast.error(t("lights.toasts.saveFailed"));
    }
  };

  const discard = () => {
    form.reset(values, DISCARD_RESET_OPTIONS);
    previewLights(values);
  };

  return {
    control: form.control,
    isLoaded: !!device?.guid,
    canControl,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    schedulePreview,
    testCelebration: async () => {
      if (!canControl) return;
      try {
        const durationMs = form.getValues("valueCelebrationDurationMs");
        const ledCount = isFirmwareFeatureSupported(firmwareVersion, "configurableLighting")
          ? form.getValues("lightLedCount") : undefined;
        const { sent, line } = await sendRequest(toValueCelebrationCommand(durationMs, ledCount));
        if (!sent || !line || confirmedValueCelebrationDuration(line, durationMs, ledCount) === null) {
          throw new Error("Celebration preview blocked or unconfirmed");
        }
      } catch (error) {
        console.error("Celebration preview failed:", error);
        toast.error(t("lights.celebration.previewFailed"));
      }
    },
    clearAlert: () => {
      const draft = lightSettingsSchema.safeParse(form.getValues());
      if (!draft.success) {
        toast.error(t("lights.toasts.previewFailed"));
        return;
      }
      previewLights(draft.data, { clearAlert: true });
    },
    save: () => void form.handleSubmit(save)(),
    discard,
  };
}
