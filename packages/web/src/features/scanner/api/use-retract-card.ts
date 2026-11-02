import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FIRMWARE_FEATURE_MIN_VERSIONS,
  isFirmwareFeatureSupported,
  parseSerialReply,
  RETRACT_CARD_TIMEOUT_MS,
  retractCardOutcome,
} from "@magic-vault/shared";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";

export function useRetractCard() {
  const { t } = useTranslation("scanner");
  const { t: tCommon } = useTranslation("common");
  const toast = useStationToast();
  const { sendRequest, isConnected, isReady, firmwareVersion } = useSerial();
  const [isRetracting, setIsRetracting] = useState(false);
  const isRetractLocked =
    isConnected && !isFirmwareFeatureSupported(firmwareVersion, "retractCard");

  const retractCard = useCallback(async () => {
    if (!isReady) return;
    setIsRetracting(true);
    try {
      const { sent, line } = await sendRequest(
        { retractCard: true },
        RETRACT_CARD_TIMEOUT_MS,
      );
      const outcome = retractCardOutcome(
        sent ? parseSerialReply(line) : null,
      );
      if (outcome === "retracted") {
        toast.success(t("retractCard.done"));
      } else if (outcome === "rollback_off") {
        toast.error(t("retractCard.rollbackOff.title"), {
          description: t("retractCard.rollbackOff.description"),
        });
      } else {
        toast.error(t("retractCard.failed.title"), {
          description: t("retractCard.failed.description"),
        });
      }
    } finally {
      setIsRetracting(false);
    }
  }, [toast, isReady, sendRequest, t]);

  return {
    retractCard,
    isRetracting,
    isRetractLocked,
    retractLockedReason: isRetractLocked
      ? tCommon("firmwareGate.requires", {
          version: FIRMWARE_FEATURE_MIN_VERSIONS.retractCard,
        })
      : null,
  };
}
