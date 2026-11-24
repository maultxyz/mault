import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { formatPriceInCurrency } from "@magic-vault/shared";
import { useLatestScanGiftReveal } from "@/features/scanner/lib/scan-gift-reveal-store";

export function ScanGiftRevealAnnouncer() {
  const { t } = useTranslation();
  const latestReveal = useLatestScanGiftReveal();
  const announcedScanIdRef = useRef(latestReveal?.scanId ?? null);
  useEffect(() => {
    if (!latestReveal || latestReveal.scanId === announcedScanIdRef.current) return;
    announcedScanIdRef.current = latestReveal.scanId;
    AccessibilityInfo.announceForAccessibility(
      t("scanGiftReveal.announcement", {
        name: latestReveal.cardName,
        price: formatPriceInCurrency(latestReveal.price, latestReveal.currency),
      }),
    );
  }, [latestReveal, t]);
  return null;
}
