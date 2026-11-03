import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CARD_CONDITIONS, type CardCondition } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import {
  invalidateCollectionCards,
  removeCollectionCards,
  updateCollectionCard,
} from "@/features/collections/api/collection-cards";
import { useMoveCardsToCollection } from "@/features/collections/api/use-move-cards-to-collection";
import { billingQueryOptions } from "@/features/org/api/billing";
import { moveCardsToStorageLocation, storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { CardActionsSheetProps } from "@/lib/interfaces/collections";
import type { CardUpdateBody } from "@/lib/interfaces/cards";

export function CardActionsSheet({ entry, collectionGuid, foilOptions, onClose }: CardActionsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState<"foil" | "condition" | "location" | "collection" | null>(null);
  const activeOrgId = useActiveOrgId();
  const billing = useQuery(billingQueryOptions(activeOrgId));
  const canMoveToLocation = !!billing.data && billing.data.storage !== false;
  const locations = useQuery(storageLocationsQueryOptions(activeOrgId, canMoveToLocation));
  const moveTargets = locations.data ?? [];
  const scanIds = entry?.scanIds?.length ? entry.scanIds : entry ? [entry.scanId] : [];
  const flagged = !!entry && (!!entry.lowConfidenceMatch || !!entry.alternativeMatches?.length) && !entry.corrected;

  const update = useMutation({
    mutationFn: (body: CardUpdateBody) =>
      Promise.all(scanIds.map((scanId) => updateCollectionCard(collectionGuid, scanId, body))),
    onSettled: () => invalidateCollectionCards(queryClient, collectionGuid),
    onSuccess: onClose,
  });
  const remove = useMutation({
    mutationFn: () => removeCollectionCards(collectionGuid, scanIds),
    onSettled: () => invalidateCollectionCards(queryClient, collectionGuid),
    onSuccess: onClose,
  });

  const { targetCollections, moveToCollection } = useMoveCardsToCollection({
    sourceCollectionGuid: collectionGuid,
    onMoved: onClose,
  });

  const moveToLocation = useMutation({
    mutationFn: (locationGuid: string) => moveCardsToStorageLocation(locationGuid, scanIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      invalidateCollectionCards(queryClient, collectionGuid);
      onClose();
    },
    onError: (error) => Alert.alert(t("storage.actionFailed"), error instanceof Error ? error.message : undefined),
  });

  const confirmRemove = () =>
    Alert.alert(
      t("collection.actions.removeTitle", { count: scanIds.length }),
      t("cardDetail.removeConfirmDescription"),
      [
        { text: t("cardDetail.cancel"), style: "cancel" },
        { text: t("cardDetail.remove"), style: "destructive", onPress: () => remove.mutate() },
      ],
    );

  return (
    <>
      <Modal visible={!!entry && picker == null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.border,
            ...SHEET_SHADOW,
            shadowColor: colors.popoverShadow,
            paddingBottom: insets.bottom + SPACING.md,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
            <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText size="lg" heading weight="bold" numberOfLines={1}>
                {entry?.card.name ?? ""}
              </AppText>
              {scanIds.length > 1 ? (
                <AppText size="sm" tone="secondary">
                  {t("collection.actions.copies", { count: scanIds.length })}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
          </View>
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
            <ListGroup>
              {flagged ? (
                <ListRow
                  icon="check"
                  title={t("cardDetail.markCorrect")}
                  disabled={update.isPending}
                  onPress={() => update.mutate({ confirmed: true })}
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
              <ListRow icon="trash" tone="destructive" title={t("cardDetail.remove")} onPress={confirmRemove} />
            </ListGroup>
          </View>
        </View>
      </Modal>
      <OptionSheet
        visible={picker === "foil"}
        title={t("cardDetail.foil")}
        options={[{ value: "", label: t("cardDetail.foilNone") }, ...foilOptions.map((type) => ({ value: type, label: type }))]}
        selected={[entry?.foilType ?? (entry?.isFoil ? foilOptions[0] : "")]}
        onSelect={(value) => {
          setPicker(null);
          update.mutate({ isFoil: value !== "", foilType: value === "" ? null : value });
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
          update.mutate({ condition: value as CardCondition });
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
          moveToLocation.mutate(locationGuid);
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
