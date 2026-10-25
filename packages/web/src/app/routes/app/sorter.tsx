import { Callout } from "@/components/callout";
import { MobileListRow } from "@/components/mobile-list-row";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { MobileSection } from "@/components/mobile-section";
import { Button } from "@/components/ui/button";
import { useSerial } from "@/features/scanner/api/use-serial";
import { MobileRemoteSorters } from "@/features/scanner/components/mobile-remote-sorters";
import { MobileSorterWifiSection } from "@/features/scanner/components/mobile-sorter-wifi-section";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_CARD_CLASS,
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
  MOBILE_PILL_BUTTON_CLASS,
  MOBILE_SCAN_PATH,
} from "@/lib/constants/nav";
import { SORTERS_OVERVIEW_PATH } from "@/lib/constants/scanner";
import { cn } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconBluetooth,
  IconCpu,
  IconDeviceUsb,
  IconLoader2,
  IconPlugConnectedX,
  IconStethoscope,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { isWebBluetoothSupported } from "@/lib/web-bluetooth";

export default function SorterPage() {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const serial = useSerial();
  const [busy, setBusy] = useState<"connect" | "test" | "disconnect" | null>(
    null,
  );
  const [connectingGuid, setConnectingGuid] = useState<string | null>(null);
  const bluetoothSupported = isWebBluetoothSupported();
  const usbSupported = typeof navigator !== "undefined" && !!navigator.serial;

  if (!isMobile) return <Navigate to={SORTERS_OVERVIEW_PATH} replace />;

  const run = async (kind: "connect" | "test" | "disconnect", fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const connectRemote = async (deviceGuid: string) => {
    setConnectingGuid(deviceGuid);
    try {
      await run("connect", () => serial.connectCloud(deviceGuid));
    } finally {
      setConnectingGuid(null);
    }
  };

  const stateLabel = !serial.isConnected
    ? t("mobileScan.sorterState.notConnected")
    : serial.sensorBlockedModule !== null
      ? t("mobileScan.sorterState.blocked")
      : serial.isReady
        ? t("mobileScan.sorterState.ready")
        : t("mobileScan.sorterState.testing");
  const stateDot = !serial.isConnected
    ? "bg-foreground/30"
    : serial.sensorBlockedModule !== null
      ? "bg-destructive"
      : serial.isReady
        ? "bg-success"
        : "bg-warning animate-pulse motion-reduce:animate-none";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={t("mobileSorter.title")}
        subtitle={t("mobileSorter.subtitle")}
        backTo={MOBILE_SCAN_PATH}
      />
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className={MOBILE_PAGE_BODY_CLASS}>
          <div className={cn(MOBILE_CARD_CLASS, "flex items-center gap-4 p-4")}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-background text-foreground [&_svg]:size-6">
              <IconCpu />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                <span className={cn("size-2.5 shrink-0 rounded-full", stateDot)} />
                <span className="truncate">{stateLabel}</span>
              </p>
              <p className="truncate text-sm text-foreground/70">
                {serial.isConnected
                  ? [
                      serial.firmwareVersion &&
                        t("mobileSorter.firmware", {
                          version: serial.firmwareVersion,
                        }),
                      serial.board,
                      serial.transport &&
                        t(`mobileSorter.transport.${serial.transport}`),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : t("mobileSorter.connectHint")}
              </p>
            </div>
          </div>

          {serial.sensorBlockedModule !== null && (
            <Callout
              variant="error"
              icon={IconAlertTriangle}
              title={t("scannerOverlay.sensorBlocked", {
                module: serial.sensorBlockedModule,
              })}
            >
              <Button
                variant="secondary"
                className={cn(MOBILE_PILL_BUTTON_CLASS, "mt-2")}
                onClick={serial.reopenSensorBlockedToast}
              >
                {t("scannerOverlay.resolveSensorBlocked")}
              </Button>
            </Callout>
          )}

          {!serial.isConnected ? (
            <div className="flex flex-col gap-2">
              {bluetoothSupported && (
                <Button
                  className={MOBILE_PILL_BUTTON_CLASS}
                  disabled={busy !== null}
                  onClick={() => void run("connect", () => serial.connectBluetooth())}
                >
                  {busy === "connect" && !connectingGuid ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconBluetooth />
                  )}
                  {t("mobileSorter.connectBluetooth")}
                </Button>
              )}
              {usbSupported && (
                <Button
                  variant="secondary"
                  className={MOBILE_PILL_BUTTON_CLASS}
                  disabled={busy !== null}
                  onClick={() => void run("connect", () => serial.connect())}
                >
                  <IconDeviceUsb />
                  {t("mobileSorter.connectUsb")}
                </Button>
              )}
              {!bluetoothSupported && !usbSupported && (
                <Callout variant="info">
                  {t("mobileSorter.unsupported")}
                </Callout>
              )}
              <MobileRemoteSorters
                disabled={busy !== null}
                connectingGuid={connectingGuid}
                onConnect={connectRemote}
              />
            </div>
          ) : (
            <MobileSection title={t("mobileSorter.actions")}>
              <div className={MOBILE_LIST_CLASS}>
                <MobileListRow
                  icon={
                    busy === "test" ? (
                      <IconLoader2 className="animate-spin" />
                    ) : (
                      <IconStethoscope />
                    )
                  }
                  label={t("mobileSorter.selfTest")}
                  description={t("mobileSorter.selfTestDescription")}
                  disabled={busy !== null}
                  onClick={() => void run("test", () => serial.runTest())}
                />
                <MobileListRow
                  icon={<IconPlugConnectedX />}
                  label={t("mobileSorter.disconnect")}
                  destructive
                  disabled={busy !== null}
                  onClick={() => void run("disconnect", () => serial.disconnect())}
                />
              </div>
            </MobileSection>
          )}

          {serial.isConnected && <MobileSorterWifiSection />}

          <p className="text-sm text-foreground/70">
            {t("mobileSorter.calibrateOnDesktop")}
          </p>
        </div>
      </div>
    </div>
  );
}
