import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { shareScanImage } from "@/features/cards/lib/share-scan-image";

export function useShareScanImage() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: shareScanImage,
    onError: () => AccessibilityInfo.announceForAccessibility(t("cardDetail.downloadPhotoFailed")),
  });
}
