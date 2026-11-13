import type {
  DesktopScannerButton,
  DesktopScannerCommand,
} from "@magic-vault/shared";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { publishScannerControls } from "@/features/scanner/lib/desktop-scanner-controls";
import {
  FLATBED_IDLE_STEPS,
  SESSION_TIMER_RUNNING_STATUSES,
} from "@/lib/constants/scanner";
import type { DesktopScannerControlsOptions } from "@/lib/interfaces/scanner";

export function useDesktopScannerControls({
  status,
  enabled,
  isConnected,
  isReady,
  autoFeed,
  isClearingDevice,
  onPause,
  onResume,
  onToggleAutoFeed,
  onClearDevice,
  flatbedScan,
}: DesktopScannerControlsOptions) {
  const { t } = useTranslation("scanner");
  const ownerRef = useRef(Symbol("scanner"));
  const onScanCard = flatbedScan?.scanCard;
  const handlersRef = useRef({ onPause, onResume, onToggleAutoFeed, onClearDevice, onScanCard });
  handlersRef.current = { onPause, onResume, onToggleAutoFeed, onClearDevice, onScanCard };
  const runRef = useRef((command: DesktopScannerCommand) => {
    const handlers = handlersRef.current;
    if (command === "scan-card") handlers.onScanCard?.();
    else if (command === "pause") handlers.onPause();
    else if (command === "resume") handlers.onResume();
    else if (command === "toggle-auto-feed") handlers.onToggleAutoFeed();
    else handlers.onClearDevice();
  });

  const isPaused = status === "paused";
  const isRunning = SESSION_TIMER_RUNNING_STATUSES.includes(status);
  const flatbedStep = flatbedScan?.step ?? null;

  const buttons = useMemo((): DesktopScannerButton[] | null => {
    if (!enabled) return null;
    if (flatbedStep) {
      const flatbedButtons: DesktopScannerButton[] = [
        {
          command: "scan-card",
          icon: "play",
          tooltip: t("flatbed.scanCard"),
          disabled: !FLATBED_IDLE_STEPS.includes(flatbedStep),
        },
      ];
      if (isConnected) {
        flatbedButtons.push({
          command: "clear-device",
          icon: "clear-device",
          tooltip: t("scannerControls.clearDeviceTooltip"),
          disabled: !isReady || isClearingDevice,
        });
      }
      return flatbedButtons;
    }
    if (!isPaused && !isRunning) return null;
    const list: DesktopScannerButton[] = [
      isPaused
        ? { command: "resume", icon: "play", tooltip: t("scannerControls.resume") }
        : { command: "pause", icon: "pause", tooltip: t("scannerControls.pause") },
    ];
    if (isConnected) {
      list.push(
        {
          command: "toggle-auto-feed",
          icon: autoFeed ? "auto-feed-on" : "auto-feed-off",
          tooltip: autoFeed
            ? t("scannerControls.autoFeedOnTooltip")
            : t("scannerControls.autoFeedOffTooltip"),
        },
        {
          command: "clear-device",
          icon: "clear-device",
          tooltip: t("scannerControls.clearDeviceTooltip"),
          disabled: !isReady || isClearingDevice,
        },
      );
    }
    return list;
  }, [
    enabled,
    flatbedStep,
    isPaused,
    isRunning,
    isConnected,
    isReady,
    autoFeed,
    isClearingDevice,
    t,
  ]);

  useEffect(() => {
    publishScannerControls(ownerRef.current, buttons, runRef.current);
  }, [buttons]);

  useEffect(() => {
    const owner = ownerRef.current;
    const run = runRef.current;
    return () => publishScannerControls(owner, null, run);
  }, []);

  useEffect(() => {
    const desktop = window.maultDesktop;
    if (!desktop || !enabled) return;
    return desktop.onScannerCommand(runRef.current);
  }, [enabled]);
}
