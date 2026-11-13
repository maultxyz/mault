import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useToast } from "@/components/ui/toast-provider";
import {
  invalidateCollectionCards,
  moveCollectionCardsToCollection,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActiveOrgId } from "@/hooks/use-org";
import { TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import type { MoveCardsToCollectionOptions, MoveCardsToCollectionVariables } from "@/lib/interfaces/collections";

export function useMoveCardsToCollection({ sourceCollectionGuid, onMoved }: MoveCardsToCollectionOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeOrgId = useActiveOrgId();
  const collections = useQuery(collectionsQueryOptions(activeOrgId));
  const { showToast } = useToast();

  const targetCollections = useMemo(() => {
    const all = collections.data ?? [];
    const source = all.find((collection) => collection.guid === sourceCollectionGuid);
    if (!source) return [];
    return all.filter(
      (collection) =>
        collection.guid !== source.guid && (collection.game?.guid ?? null) === (source.game?.guid ?? null),
    );
  }, [collections.data, sourceCollectionGuid]);

  const refreshAfterMove = (fromCollectionGuid: string, toCollectionGuid: string) => {
    invalidateCollectionCards(queryClient, fromCollectionGuid);
    invalidateCollectionCards(queryClient, toCollectionGuid);
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const moveBack = useMutation({
    mutationFn: ({ scanIds, targetCollectionGuid }: MoveCardsToCollectionVariables) =>
      moveCollectionCardsToCollection(targetCollectionGuid, scanIds, sourceCollectionGuid),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("recovery.restored")),
    onError: () => showToast({ message: t("recovery.undoFailed"), tone: "destructive" }),
    onSettled: (_result, _error, { targetCollectionGuid }) => refreshAfterMove(sourceCollectionGuid, targetCollectionGuid),
  });

  const moveToCollection = useMutation({
    mutationFn: ({ scanIds, targetCollectionGuid }: MoveCardsToCollectionVariables) =>
      moveCollectionCardsToCollection(sourceCollectionGuid, scanIds, targetCollectionGuid),
    onSuccess: (_result, variables) => {
      refreshAfterMove(sourceCollectionGuid, variables.targetCollectionGuid);
      const targetName =
        (collections.data ?? []).find((collection) => collection.guid === variables.targetCollectionGuid)?.name ?? "";
      showToast({
        message: t("recovery.movedTo", { name: targetName }),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: { label: t("recovery.undo"), onPress: () => moveBack.mutate(variables) },
      });
      onMoved?.();
    },
    onError: (_error, variables) =>
      showToast({
        message: t("storage.moveToCollectionFailed"),
        tone: "destructive",
        action: { label: t("recovery.retry"), onPress: () => moveToCollection.mutate(variables) },
      }),
  });

  return { targetCollections, moveToCollection };
}
