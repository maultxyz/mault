import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { CARD_CONDITIONS, DEFAULT_CARD_CONDITION, type CardCondition } from "@magic-vault/shared";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast-provider";
import { useDeferredCardRemoval } from "@/features/cards/api/use-deferred-card-removal";
import { cardUpdatePatch, patchCardsInCaches, restoreCardCaches } from "@/features/cards/lib/card-list-cache";
import { invalidateCollectionCards, updateCollectionCard } from "@/features/collections/api/collection-cards";
import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { billingQueryOptions } from "@/features/org/api/billing";
import {
  moveCardsToStorageLocation,
  removeCardsFromStorageLocations,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { TOAST_UNDO_DURATION_MS } from "@/lib/constants/ui";
import type { CardActionsLocationMove, CardActionsSheetProps, CardActionsUpdate } from "@/lib/interfaces/collections";
import type { CardCachePatchContext } from "@/lib/interfaces/undo";

export function CardActionsSheet({ entry, collectionGuid, foilOptions, onClose }: CardActionsSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [picker, setPicker] = useState<"foil" | "condition" | "location" | "collection" | null>(null);
  const activeOrgId = useActiveOrgId();
  const billing = useQuery(billingQueryOptions(activeOrgId));
  const canMoveToLocation = !!billing.data && billing.data.storage !== false;
  const locations = useQuery(storageLocationsQueryOptions(activeOrgId, canMoveToLocation));
  const moveTargets = locations.data ?? [];
  const scanIds = entry?.scanIds?.length ? entry.scanIds : entry ? [entry.scanId] : [];
  const flagged = !!entry && (!!entry.lowConfidenceMatch || !!entry.alternativeMatches?.length) && !entry.corrected;

  const update = useMutation({
    mutationFn: ({ scanIds: updatedScanIds, body }: CardActionsUpdate) =>
      Promise.all(updatedScanIds.map((scanId) => updateCollectionCard(collectionGuid, scanId, body))),
    onMutate: async ({ scanIds: updatedScanIds, body }: CardActionsUpdate): Promise<CardCachePatchContext> => ({
      snapshot: await patchCardsInCaches(queryClient, collectionGuid, updatedScanIds, cardUpdatePatch(body)),
    }),
    onSuccess: (_result, change) => {
      if (change.isUndo) {
        AccessibilityInfo.announceForAccessibility(t("recovery.restored"));
        return;
      }
      const { undoBody, changeMessage } = change;
      if (!undoBody || !changeMessage) return;
      showToast({
        message: changeMessage,
        durationMs: TOAST_UNDO_DURATION_MS,
        action: {
          label: t("recovery.undo"),
          onPress: () => update.mutate({ scanIds: change.scanIds, body: undoBody, isUndo: true }),
        },
      });
    },
    onError: (_error, change, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
      showToast({
        message: change.isUndo ? t("recovery.undoFailed") : t("cardDetail.saveFailed"),
        tone: "destructive",
        action: change.isUndo ? undefined : { label: t("recovery.retry"), onPress: () => update.mutate(change) },
      });
    },
    onSettled: () => invalidateCollectionCards(queryClient, collectionGuid),
  });

  const runUpdate = (change: CardActionsUpdate) => {
    onClose();
    update.mutate(change);
  };
  const removeCardsWithUndo = useDeferredCardRemoval();

  const { targetCollections, moveToCollection } = useMoveCardsToCollection({
    sourceCollectionGuid: collectionGuid,
    onMoved: onClose,
  });

  const refreshAfterLocationChange = () => {
    void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    invalidateCollectionCards(queryClient, collectionGuid);
  };

  const restoreLocation = useMutation({
    mutationFn: ({ scanIds: movedScanIds, previousLocationGuid }: CardActionsLocationMove) =>
      previousLocationGuid
        ? moveCardsToStorageLocation(previousLocationGuid, movedScanIds)
        : removeCardsFromStorageLocations(movedScanIds).then(() => undefined),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("recovery.restored")),
    onError: () => showToast({ message: t("recovery.undoFailed"), tone: "destructive" }),
    onSettled: refreshAfterLocationChange,
  });

  const moveToLocation = useMutation({
    mutationFn: ({ scanIds: movedScanIds, locationGuid }: CardActionsLocationMove) =>
      moveCardsToStorageLocation(locationGuid, movedScanIds),
    onSuccess: (_result, move) => {
      const locationName = moveTargets.find((location) => location.guid === move.locationGuid)?.name ?? "";
      showToast({
        message: t("recovery.movedTo", { name: locationName }),
        durationMs: TOAST_UNDO_DURATION_MS,
        action: move.canUndo ? { label: t("recovery.undo"), onPress: () => restoreLocation.mutate(move) } : undefined,
      });
    },
    onError: (_error, move) =>
      showToast({
        message: t("storage.actionFailed"),
        tone: "destructive",
        action: { label: t("recovery.retry"), onPress: () => moveToLocation.mutate(move) },
      }),
    onSettled: refreshAfterLocationChange,
  });

  const removeWithUndo = () => {
    onClose();
    removeCardsWithUndo({ collectionGuid, scanIds });
  };

  return (
    <>
      <Sheet
        visible={!!entry && picker == null}
        onClose={onClose}
        title={entry?.card.name ?? ""}
        description={scanIds.length > 1 ? t("collection.actions.copies", { count: scanIds.length }) : null}
      >
        <ListGroup>
          {flagged ? (
            <ListRow
              icon="check"
              title={t("cardDetail.markCorrect")}
              disabled={update.isPending}
              onPress={() => runUpdate({ scanIds, body: { confirmed: true } })}
            />
          ) : null}
          <ListRow icon="sparkles" title={t("cardDetail.foil")} onPress={() => setPicker("foil")} />
          <ListRow icon="condition" title={t("cardDetail.condition")} onPress={() => setPicker("condition")} />
          {canMoveToLocation && moveTargets.length > 0 ? (
            <ListRow
              icon="transfer"
              title={t("storage.moveToLocation")}
              disabled={moveToLocation.isPending}
              onPress={() => setPicker("location")}
            />
          ) : null}
          {targetCollections.length > 0 ? (
            <ListRow
              icon="collections"
              title={t("storage.moveToCollection")}
              disabled={moveToCollection.isPending}
              onPress={() => setPicker("collection")}
            />
          ) : null}
          <ListRow icon="trash" tone="destructive" title={t("cardDetail.remove")} onPress={removeWithUndo} />
        </ListGroup>
      </Sheet>
      <OptionSheet
        visible={picker === "foil"}
        title={t("cardDetail.foil")}
        options={[{ value: "", label: t("cardDetail.foilNone") }, ...foilOptions.map((type) => ({ value: type, label: type }))]}
        selected={[entry?.foilType ?? (entry?.isFoil ? foilOptions[0] : "")]}
        onSelect={(value) => {
          setPicker(null);
          const previousFoilType = entry?.foilType ?? (entry?.isFoil ? foilOptions[0] : null);
          runUpdate({
            scanIds,
            body: { isFoil: value !== "", foilType: value === "" ? null : value },
            undoBody: { isFoil: previousFoilType != null, foilType: previousFoilType },
            changeMessage: t("recovery.foilChanged", { value: value === "" ? t("cardDetail.foilNone") : value }),
          });
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "condition"}
        title={t("cardDetail.condition")}
        options={CARD_CONDITIONS.map((value) => ({ value, label: t(`cardDetail.conditions.${value}`) }))}
        selected={[entry?.condition ?? "NM"]}
        onSelect={(value) => {
          setPicker(null);
          const condition = value as CardCondition;
          runUpdate({
            scanIds,
            body: { condition },
            undoBody: { condition: entry?.condition ?? DEFAULT_CARD_CONDITION },
            changeMessage: t("recovery.conditionChanged", { value: t(`cardDetail.conditions.${condition}`) }),
          });
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "location"}
        title={t("storage.moveToLocation")}
        options={moveTargets.map((location) => ({ value: location.guid, label: location.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchLocations")}
        onSelect={(locationGuid) => {
          setPicker(null);
          onClose();
          moveToLocation.mutate({
            scanIds,
            locationGuid,
            previousLocationGuid: entry?.storageLocation?.guid ?? null,
            canUndo: scanIds.length === 1,
          });
        }}
        onClose={() => setPicker(null)}
      />
      <OptionSheet
        visible={picker === "collection"}
        title={t("storage.moveToCollection")}
        options={targetCollections.map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={[]}
        searchPlaceholder={t("storage.searchCollections")}
        onSelect={(targetCollectionGuid) => {
          setPicker(null);
          moveToCollection.mutate({ scanIds, targetCollectionGuid });
        }}
        onClose={() => setPicker(null)}
      />
    </>
  );
}
