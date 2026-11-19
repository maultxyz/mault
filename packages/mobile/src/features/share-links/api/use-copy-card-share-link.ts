import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { createCardShareLink } from "@/features/share-links/api/card-share-links";
import { invalidateShareLinks, orgShareLinkUrl } from "@/features/share-links/api/share-links";

export function useCopyCardShareLink() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scanId: string) => {
      const link = await createCardShareLink(scanId);
      await Clipboard.setStringAsync(orgShareLinkUrl({ ...link, kind: "card", subjectGuid: scanId }));
    },
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("cardDetail.shareLinkCopied")),
    onError: () => AccessibilityInfo.announceForAccessibility(t("cardDetail.shareLinkCopyFailed")),
    onSettled: () => invalidateShareLinks(queryClient),
  });
}
