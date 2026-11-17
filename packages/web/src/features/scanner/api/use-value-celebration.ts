import { useDevice } from "@/features/calibration/api/use-device";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { usePriceSource } from "@/hooks/use-price-source";
import { VALUE_CELEBRATION_SETTLE_MS } from "@/lib/constants/lighting";
import {
  isFirmwareFeatureSupported,
  confirmedValueCelebrationDuration,
  toValueCelebrationCommand,
  toSetLightCommand,
  qualifiesForValueCelebration,
  type PlayingCard,
} from "@magic-vault/shared";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

export function useValueCelebration() {
  const device = useDevice();
  const { source, priceOf } = usePriceSource();
  const serial = useSerial();
  const toast = useStationToast();
  const { t } = useTranslation("calibration");
  const current = useRef({ device, source, priceOf, serial });
  current.current = { device, source, priceOf, serial };

  return useCallback((card: PlayingCard, isFoil?: boolean) => {
    if (!device || !serial.isReady ||
      !isFirmwareFeatureSupported(serial.firmwareVersion, "lighting") ||
      !qualifiesForValueCelebration(device, source, priceOf(card, isFoil))) {
      return undefined;
    }
    const guid = device.guid;
    return async (): Promise<boolean> => {
      const active = current.current;
      if (active.device?.guid !== guid || !active.serial.isReady ||
        !qualifiesForValueCelebration(active.device, active.source, active.priceOf(card, isFoil))) {
        return false;
      }
      try {
        const configurableLightingSupported = isFirmwareFeatureSupported(active.serial.firmwareVersion, "configurableLighting");
        const ledCount = configurableLightingSupported ? active.device.lightLedCount : undefined;
        const { sent, line } = await active.serial.sendRequest(toValueCelebrationCommand(active.device.valueCelebrationDurationMs, ledCount));
        if (!sent || !line) throw new Error("No celebration acknowledgement");
        const durationMs = confirmedValueCelebrationDuration(line, active.device.valueCelebrationDurationMs, ledCount);
        if (durationMs === null) return false;
        await new Promise<void>((resolve) => setTimeout(resolve, durationMs + VALUE_CELEBRATION_SETTLE_MS));
        const latest = current.current;
        if (latest.device?.guid !== guid || !latest.serial.isReady) return false;
        const rgbwSupported = isFirmwareFeatureSupported(latest.serial.firmwareVersion, "rgbwLighting");
        const restoreCommand = toSetLightCommand(latest.device, { configurableLightingSupported, rgbwSupported });
        const restored = await latest.serial.sendRequest(restoreCommand);
        if (!restored.sent || !restored.line) throw new Error("Main lighting restoration not confirmed");
        const state: unknown = JSON.parse(restored.line);
        if (!state || typeof state !== "object" || !("status" in state) || state.status !== "ok" ||
          !("lightAlert" in state) || state.lightAlert !== "none" || !("leds" in state) || state.leds !== restoreCommand.setLight.leds ||
          (configurableLightingSupported && (!("ledCount" in state) || state.ledCount !== latest.device.lightLedCount))) {
          throw new Error("Main lighting still overridden after celebration");
        }
        return current.current.device?.guid === guid && current.current.serial.isReady;
      } catch (error) {
        console.error("Value celebration failed:", error);
        toast.error(t("lights.celebration.failed"));
        return false;
      }
    };
  }, [device, source, priceOf, serial, toast, t]);
}
