import { useDevice } from "@/features/calibration/api/use-device";
import { assertCameraLightPreviewAvailable, assertCameraLightReply, restoreCameraLightAfterPreview } from "@/features/calibration/lib/camera-light-test";
import { useIsSessionActive } from "@/features/scanner/api/use-is-session-active";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { CameraLightTestValues, Device } from "@/lib/interfaces/calibration";
import { cameraLightTestSchema } from "@/schemas/camera-light-test.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { assertLightLedCountReply, assertLightWarningReply, isFirmwareFeatureSupported, toSetLightCommand } from "@magic-vault/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useCameraLightTest() {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const device = useDevice();
  const serial = useSerial();
  const sessionActive = useIsSessionActive();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = useRef({ device, serial });
  current.current = { device, serial };
  const snapshot = useRef<{ device: Device; deviceId: string | null } | null>(null);
  const operation = useRef<Promise<void> | null>(null);
  const stopping = useRef<Promise<void> | null>(null);
  const values = useMemo<CameraLightTestValues>(() => ({
    lightMode: device?.lightMode === "custom" || device?.lightMode === "white" ? device.lightMode : "off",
    lightColor: device?.lightColor ?? "#ffffff",
    lightBrightness: device?.lightBrightness ?? 160,
    lightWhite: device?.lightWhite ?? 0,
  }), [device?.lightMode, device?.lightColor, device?.lightBrightness, device?.lightWhite]);
  const form = useForm<CameraLightTestValues>({
    resolver: zodResolver(cameraLightTestSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const canApply = !!device && serial.isReady && !sessionActive &&
    isFirmwareFeatureSupported(serial.firmwareVersion, "lighting");
  const rgbwSupported = isFirmwareFeatureSupported(serial.firmwareVersion, "rgbwLighting");

  const send = useCallback(async (target: { device: Device; deviceId: string | null }, settings: Device, preview: boolean) => {
    const { device: currentDevice, serial: connection } = current.current;
    if (!connection.isReady || currentDevice?.guid !== target.device.guid || connection.deviceId !== target.deviceId) {
      throw new Error("Sorter connection changed during lighting test");
    }
    const warningsSupported = isFirmwareFeatureSupported(connection.firmwareVersion, "lightingWarnings");
    const configurableLightingSupported = isFirmwareFeatureSupported(connection.firmwareVersion, "configurableLighting");
    const command = toSetLightCommand(settings, {
      warningsSupported,
      configurableLightingSupported,
      rgbwSupported: isFirmwareFeatureSupported(connection.firmwareVersion, "rgbwLighting"),
    });
    const { sent, line } = await connection.sendRequest(command);
    if (!sent || !line) throw new Error("Lighting acknowledgement missing");
    assertCameraLightReply(line, settings, command.setLight.leds);
    if (warningsSupported) assertLightWarningReply(line, settings);
    if (configurableLightingSupported) assertLightLedCountReply(line, settings.lightLedCount);
    if (preview) assertCameraLightPreviewAvailable(line);
  }, []);

  const stop = useCallback((): Promise<void> => {
    if (stopping.current) return stopping.current;
    const target = snapshot.current;
    if (!target) return Promise.resolve();
    setBusy(true);
    const run = (async () => {
      try {
        await restoreCameraLightAfterPreview(operation.current, () => send(target, target.device, false));
        snapshot.current = null;
        setActive(false);
        form.reset();
      } catch (error) {
        console.error("Camera lighting restoration failed:", error);
        toast.error(t("cameraLightTest.restoreFailed"));
        if (!current.current.serial.isReady ||
          current.current.serial.deviceId !== target.deviceId ||
          current.current.device?.guid !== target.device.guid) {
          snapshot.current = null;
          setActive(false);
        }
      } finally {
        setBusy(false);
        stopping.current = null;
      }
    })();
    stopping.current = run;
    return run;
  }, [form, send, t, toast]);
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => { void stopRef.current(); }, []);
  useEffect(() => {
    if (active && (sessionActive || !serial.isReady || device?.guid !== snapshot.current?.device.guid ||
      serial.deviceId !== snapshot.current?.deviceId)) void stop();
  }, [active, sessionActive, serial.isReady, serial.deviceId, device?.guid, stop]);

  const apply = form.handleSubmit(async (settings) => {
    if (!canApply || !device || operation.current || stopping.current || serial.isRouteBusy()) {
      toast.error(t("cameraLightTest.unavailable"));
      return;
    }
    const target = snapshot.current ?? { device, deviceId: serial.deviceId };
    snapshot.current = target;
    setActive(true);
    setBusy(true);
    const run = send(target, { ...target.device, ...settings }, true);
    operation.current = run;
    try {
      await run;
    } catch (error) {
      console.error("Camera lighting preview failed:", error);
      toast.error(t("cameraLightTest.previewFailed"));
    } finally {
      operation.current = null;
      if (!stopping.current) setBusy(false);
    }
  });

  return { control: form.control, apply, stop, active, busy, canApply, rgbwSupported };
}
