import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import {
  invalidateCollectionCards,
  moveCollectionCardsToCollection,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActiveOrgId } from "@/hooks/use-org";
import type { MoveCardsToCollectionOptions, MoveCardsToCollectionVariables } from "@/lib/interfaces/collections";

export function useMoveCardsToCollection({ sourceCollectionGuid, onMoved }: MoveCardsToCollectionOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeOrgId = useActiveOrgId();
  const collections = useQuery(collectionsQueryOptions(activeOrgId));

  const targetCollections = useMemo(() => {
    const all = collections.data ?? [];
    const source = all.find((collection) => collection.guid === sourceCollectionGuid);
    if (!source) return [];
    return all.filter(
      (collection) =>
        collection.guid !== source.guid && (collection.game?.guid ?? null) === (source.game?.guid ?? null),
    );
  }, [collections.data, sourceCollectionGuid]);

  const moveToCollection = useMutation({
    mutationFn: ({ scanIds, targetCollectionGuid }: MoveCardsToCollectionVariables) =>
      moveCollectionCardsToCollection(sourceCollectionGuid, scanIds, targetCollectionGuid),
    onSuccess: (_result, { targetCollectionGuid }) => {
      invalidateCollectionCards(queryClient, sourceCollectionGuid);
      invalidateCollectionCards(queryClient, targetCollectionGuid);
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      onMoved?.();
    },
    onError: (error) =>
      Alert.alert(t("storage.moveToCollectionFailed"), error instanceof Error ? error.message : undefined),
  });

  return { targetCollections, moveToCollection };
}
