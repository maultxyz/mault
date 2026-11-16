import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useIsOnline } from "@/hooks/use-is-online";

export function useConnectivityAnnouncements() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const announcedOnlineRef = useRef(true);

  useEffect(() => {
    if (isOnline === announcedOnlineRef.current) return;
    announcedOnlineRef.current = isOnline;
    AccessibilityInfo.announceForAccessibility(
      isOnline ? t("offline.backOnline") : `${t("offline.title")}. ${t("offline.description")}`,
    );
  }, [isOnline, t]);
}
