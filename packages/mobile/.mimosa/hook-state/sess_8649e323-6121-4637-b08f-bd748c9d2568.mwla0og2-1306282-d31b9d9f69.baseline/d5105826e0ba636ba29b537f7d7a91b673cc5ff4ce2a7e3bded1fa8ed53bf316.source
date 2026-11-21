import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { endScanLiveActivity, showScanLiveActivity } from "@/features/widgets/api/scan-live-activity";
import type { ScanLiveActivityOptions, ScanSessionLiveActivityProps } from "@/lib/interfaces/live-activity";

export function useScanLiveActivity({
  isActive,
  phase,
  collectionName,
  sessionCount,
  lastCardName,
  lastBinNumber,
}: ScanLiveActivityOptions): void {
  const { t } = useTranslation();
  const latestPropsRef = useRef<ScanSessionLiveActivityProps | null>(null);

  const props: ScanSessionLiveActivityProps = {
    title: t("scan.liveActivity.title"),
    collectionName: collectionName ?? "",
    statusLabel: isActive ? t("scan.liveActivity.scanning") : t(`scan.phase.${phase}`),
    isRunning: isActive,
    scannedCountLabel: t("scan.liveActivity.scannedCount", { count: sessionCount }),
    scannedCount: sessionCount,
    lastCardLabel: lastCardName ? t("scan.liveActivity.lastCard", { name: lastCardName }) : t("scan.liveActivity.noCardYet"),
    binLabel: lastBinNumber != null ? t("scan.handScanBin", { number: lastBinNumber }) : "",
  };
  latestPropsRef.current = props;
  const snapshot = JSON.stringify(props);

  useEffect(() => {
    if (!isActive || !latestPropsRef.current) return;
    showScanLiveActivity(latestPropsRef.current);
  }, [isActive, snapshot]);

  useEffect(() => {
    if (isActive) return;
    endScanLiveActivity(latestPropsRef.current ?? undefined);
  }, [isActive]);

  useEffect(() => () => endScanLiveActivity(latestPropsRef.current ?? undefined), []);
}
