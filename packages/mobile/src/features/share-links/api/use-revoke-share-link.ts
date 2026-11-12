import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { invalidateShareLinks, revokeShareLink } from "@/features/share-links/api/share-links";

export function useRevokeShareLink(onRevoked?: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeShareLink,
    onSuccess: () => {
      AccessibilityInfo.announceForAccessibility(t("shareLinks.revoked"));
      onRevoked?.();
    },
    onError: () => AccessibilityInfo.announceForAccessibility(t("shareLinks.revokeFailed")),
    onSettled: () => invalidateShareLinks(queryClient),
  });
}
