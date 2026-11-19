import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useToast } from "@/components/ui/toast-provider";
import {
  hideCardsInCaches,
  restoreCardCaches,
  snapshotCardCaches,
} from "@/features/cards/lib/card-list-cache";
import {
  cancelPendingCardRemoval,
  commitPendingCardRemoval,
  registerPendingCardRemoval,
} from "@/features/cards/lib/pending-card-removals";
import {
  invalidateCollectionCards,
  removeCollectionCard,
  removeCollectionCards,
} from "@/features/collections/api/collection-cards";
import { TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import type { DeferredCardRemovalRequest } from "@/lib/interfaces/undo";

export function useDeferredCardRemoval(): (request: DeferredCardRemovalRequest) => void {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useCallback(
    function removeCardsWithUndo({ collectionGuid, scanIds }: DeferredCardRemovalRequest) {
      if (scanIds.length === 0) return;
      const snapshot = snapshotCardCaches(queryClient, collectionGuid);
      hideCardsInCaches(queryClient, collectionGuid, scanIds);

      const commitRemoval = async () => {
        try {
          if (scanIds.length === 1) await removeCollectionCard(collectionGuid, scanIds[0]);
          else await removeCollectionCards(collectionGuid, scanIds);
        } catch {
          restoreCardCaches(queryClient, snapshot);
          showToast({
            message: t("cardDetail.removeFailed"),
            tone: "destructive",
            action: { label: t("recovery.retry"), onPress: () => removeCardsWithUndo({ collectionGuid, scanIds }) },
          });
          return;
        }
        invalidateCollectionCards(queryClient, collectionGuid);
        void queryClient.invalidateQueries({ queryKey: ["collections"] });
      };

      const pendingRemovalId = registerPendingCardRemoval(commitRemoval);
      showToast({
        message: t("recovery.cardsRemoved", { count: scanIds.length }),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: {
          label: t("recovery.undo"),
          onPress: () => {
            if (!cancelPendingCardRemoval(pendingRemovalId)) return;
            restoreCardCaches(queryClient, snapshot);
            AccessibilityInfo.announceForAccessibility(t("recovery.restored"));
          },
        },
        onExpire: () => void commitPendingCardRemoval(pendingRemovalId),
      });
    },
    [queryClient, showToast, t],
  );
}
