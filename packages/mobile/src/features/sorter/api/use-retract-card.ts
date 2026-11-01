import {
  FIRMWARE_FEATURE_MIN_VERSIONS,
  isFirmwareFeatureSupported,
} from "@magic-vault/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useSorter } from "@/features/sorter/api/use-sorter";

export function useRetractCard() {
  const { t } = useTranslation();
  const sorter = useSorter();
  const [isRetracting, setIsRetracting] = useState(false);
  const retractLockedReason =
    sorter.isConnected && !isFirmwareFeatureSupported(sorter.firmwareVersion, "retractCard")
      ? t("calibration.firmwareRequired", { version: FIRMWARE_FEATURE_MIN_VERSIONS.retractCard })
      : null;

  const retractCard = useCallback(
    async (prepareSorter?: () => Promise<void>) => {
      if (!sorter.isReady) return;
      setIsRetracting(true);
      try {
        await prepareSorter?.();
        const outcome = await sorter.retractCard();
        if (outcome === "rollback_off") {
          Alert.alert(t("retractCard.rollbackOffTitle"), t("retractCard.rollbackOffDescription"));
        } else if (outcome === "failed") {
          Alert.alert(t("retractCard.failedTitle"), t("retractCard.failedDescription"));
        }
      } finally {
        setIsRetracting(false);
      }
    },
    [sorter, t],
  );

  return { retractCard, isRetracting, retractLockedReason };
}
