import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import type { ScanFeedEntry } from "@/lib/interfaces/scanner";

export function useScanResultAnnouncements(feed: ScanFeedEntry[]) {
  const { t } = useTranslation();
  const latestEntry = feed[0];
  const announcedScanIdRef = useRef(latestEntry?.scanId);

  useEffect(() => {
    if (!latestEntry || latestEntry.scanId === announcedScanIdRef.current) return;
    announcedScanIdRef.current = latestEntry.scanId;
    const announcementParts = [latestEntry.card ? latestEntry.card.name : t("scan.unmatched")];
    if (latestEntry.binNumber != null) announcementParts.push(t("scan.handScanBin", { number: latestEntry.binNumber }));
    AccessibilityInfo.announceForAccessibility(announcementParts.join(", "));
  }, [latestEntry, t]);
}
