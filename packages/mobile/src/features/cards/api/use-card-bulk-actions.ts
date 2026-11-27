import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import {
  allExportAdapters,
  exportFilename,
  supportsGame,
  type CardCondition,
  type CardTag,
  type ExportAdapter,
} from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { shareCsv } from "@/features/cards/lib/share-csv";
import {
  downloadCollectionCsv,
  invalidateCollectionCards,
  markCollectionCardsDownloaded,
  moveCollectionCardsToCollection,
  removeCollectionCards,
  setCollectionCardTags,
  setCollectionCardsCondition,
  setCollectionCardsFoilType,
} from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  downloadStorageLocationCsv,
  markStorageLocationCardsDownloaded,
  moveCardsToStorageLocation,
  removeCardsFromStorageLocations,
} from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import type { CardBulkActionRun, CardBulkActionsOptions } from "@/lib/interfaces/cards";

export function useCardBulkActions({ references, storageLocationGuid, exportName, onFinished }: CardBulkActionsOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const orgId = useActiveOrgId();
  const collections = useQuery(collectionsQueryOptions(orgId));
  const count = references.length;
  const scanIds = useMemo(() => references.map((reference) => reference.scanId), [references]);

  const scanIdsByCollection = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const { scanId, collectionGuid } of references) {
      grouped.set(collectionGuid, [...(grouped.get(collectionGuid) ?? []), scanId]);
    }
    return grouped;
  }, [references]);

  const selectedCollections = useMemo(
    () => (collections.data ?? []).filter((collection) => scanIdsByCollection.has(collection.guid)),
    [collections.data, scanIdsByCollection],
  );
  const selectedGameGuids = [...new Set(selectedCollections.map((collection) => collection.game?.guid ?? null))];
  const hasSingleGame = selectedGameGuids.length === 1;
  const singleGameFoilTypes = hasSingleGame ? (selectedCollections[0]?.game?.foilTypes ?? []) : [];
  const foilOptions = hasSingleGame
    ? singleGameFoilTypes.length > 0
      ? singleGameFoilTypes
      : [t("cardDetail.foil")]
    : null;
  const exportAdapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) =>
        selectedCollections.every((collection) => supportsGame(adapter, collection.game?.key)),
      ),
    [selectedCollections],
  );
  const targetCollections = hasSingleGame
    ? (collections.data ?? []).filter(
        (collection) =>
          (collection.game?.guid ?? null) === selectedGameGuids[0] &&
          !(scanIdsByCollection.size === 1 && scanIdsByCollection.has(collection.guid)),
      )
    : [];

  const refresh = () => {
    for (const collectionGuid of scanIdsByCollection.keys()) invalidateCollectionCards(queryClient, collectionGuid);
    void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    void queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const run = useMutation({
    mutationFn: ({ work }: CardBulkActionRun) => work(),
    onSuccess: (_result, { successMessage }) => {
      onFinished();
      showToast({ message: successMessage, tone: "success" });
    },
    onError: () => showToast({ message: t("cardBulk.failed"), tone: "destructive" }),
    onSettled: refresh,
  });

  const perCollection =
    (request: (collectionGuid: string, collectionScanIds: string[]) => Promise<unknown>) => () =>
      Promise.all(
        [...scanIdsByCollection].map(([collectionGuid, collectionScanIds]) => request(collectionGuid, collectionScanIds)),
      );

  const exportCsv = useMutation({
    mutationFn: async (adapter: ExportAdapter) => {
      const request = { format: adapter.key, combineDuplicates: true, scanIds };
      const [onlyCollectionGuid] = scanIdsByCollection.keys();
      const csv = storageLocationGuid
        ? await downloadStorageLocationCsv(storageLocationGuid, request)
        : await downloadCollectionCsv(onlyCollectionGuid, request);
      await shareCsv(csv, exportFilename(adapter, exportName.replace(/\s+/g, "-").toLowerCase()));
      await (
        storageLocationGuid
          ? markStorageLocationCardsDownloaded(storageLocationGuid, scanIds)
          : markCollectionCardsDownloaded(onlyCollectionGuid, scanIds)
      ).catch((error) => console.error("Failed to mark cards downloaded:", error));
    },
    onSuccess: onFinished,
    onError: () => showToast({ message: t("export.failed"), tone: "destructive" }),
    onSettled: refresh,
  });

  return {
    isPending: run.isPending || exportCsv.isPending,
    foilOptions,
    exportAdapters,
    targetCollections,
    exportCsv: (adapter: ExportAdapter) => exportCsv.mutate(adapter),
    setFoilType: (foilType: string | null) =>
      run.mutate({
        work: perCollection((collectionGuid, ids) => setCollectionCardsFoilType(collectionGuid, ids, foilType)),
        successMessage: t("cardBulk.updated", { count }),
      }),
    setCondition: (condition: CardCondition) =>
      run.mutate({
        work: perCollection((collectionGuid, ids) => setCollectionCardsCondition(collectionGuid, ids, condition)),
        successMessage: t("cardBulk.updated", { count }),
      }),
    setTag: (tag: CardTag, enabled: boolean) =>
      run.mutate({
        work: perCollection((collectionGuid, ids) =>
          setCollectionCardTags(collectionGuid, { scanIds: ids, tags: [tag], enabled }),
        ),
        successMessage: t("cardBulk.updated", { count }),
      }),
    moveToLocation: (locationGuid: string, locationName: string) =>
      run.mutate({
        work: () => moveCardsToStorageLocation(locationGuid, scanIds),
        successMessage: t("cardBulk.movedTo", { count, name: locationName }),
      }),
    moveToCollection: (targetCollectionGuid: string, targetName: string) =>
      run.mutate({
        work: () =>
          Promise.all(
            [...scanIdsByCollection]
              .filter(([collectionGuid]) => collectionGuid !== targetCollectionGuid)
              .map(([collectionGuid, ids]) => moveCollectionCardsToCollection(collectionGuid, ids, targetCollectionGuid)),
          ),
        successMessage: t("cardBulk.movedTo", { count, name: targetName }),
      }),
    confirmRemoveFromLocation: () =>
      Alert.alert(t("cardBulk.removeFromLocationTitle", { count }), t("cardBulk.removeFromLocationDescription"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("cardBulk.removeFromLocation"),
          style: "destructive",
          onPress: () =>
            run.mutate({
              work: () => removeCardsFromStorageLocations(scanIds),
              successMessage: t("cardBulk.removedFromLocation", { count }),
            }),
        },
      ]),
    confirmDelete: () =>
      Alert.alert(t("cardBulk.deleteTitle", { count }), t("cardBulk.deleteDescription"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("cardBulk.delete"),
          style: "destructive",
          onPress: () =>
            run.mutate({
              work: perCollection((collectionGuid, ids) => removeCollectionCards(collectionGuid, ids)),
              successMessage: t("recovery.cardsRemoved", { count }),
            }),
        },
      ]),
  };
}
