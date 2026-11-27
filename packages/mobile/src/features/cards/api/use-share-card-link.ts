import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Share } from "react-native";
import { createCardShareLink } from "@/features/share-links/api/card-share-links";
import { invalidateShareLinks, orgShareLinkUrl } from "@/features/share-links/api/share-links";

export function useShareCardLink() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scanId: string) => {
      const link = await createCardShareLink(scanId);
      const shareLinkUrl = orgShareLinkUrl({ ...link, kind: "card", subjectGuid: scanId });
      await Share.share({ message: shareLinkUrl, url: shareLinkUrl });
    },
    onError: () => AccessibilityInfo.announceForAccessibility(t("cardDetail.shareLinkFailed")),
    onSettled: () => invalidateShareLinks(queryClient),
  });
}
