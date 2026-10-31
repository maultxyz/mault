import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { useViewedCollection } from "@/features/collections/api/use-viewed-collection";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useMoveCardsToLocation } from "@/features/storage/api/use-storage-locations";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import {
  cardFoilTypeOptions,
  toCardCondition,
  type CardCondition,
  type GroupedScannedCard,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { copyWithToast } from "@/lib/clipboard";

export function useCardActions(entry: GroupedScannedCard) {
  const { t } = useTranslation("cards");
  const { confirmCard, setCardsFoilType, setCardsCondition, removeCards } =
    useScannedCards();
  const gameFoilOptions = useFoilOptions();
  const { collection: viewedCollection } = useViewedCollection();
  const { isLocked: storageLocked } = useStorageAccess();
  const { moveCards, isMoving } = useMoveCardsToLocation();

  return {
    foilOptions: cardFoilTypeOptions(
      gameFoilOptions,
      entry.card,
      entry.foilType,
    ),
    canConfirm:
      (entry.lowConfidenceMatch || !!entry.alternativeMatches?.length) &&
      !entry.corrected,
    currentFoil: entry.foilType ?? (entry.isFoil ? t("foil") : null),
    currentCondition: toCardCondition(entry.condition),
    confirm: () => {
      for (const scanId of entry.scanIds) confirmCard(scanId);
    },
    setFoil: (foilType: string | null) =>
      setCardsFoilType(entry.scanIds, foilType),
    setCondition: (condition: CardCondition) =>
      setCardsCondition(entry.scanIds, condition),
    copyName: async () => {
      await copyWithToast(
        entry.card.name,
        t("cardContextMenu.copied"),
        t("cardContextMenu.copyFailed"),
      );
    },
    remove: () => removeCards(entry.scanIds),
    canMoveToLocation: !storageLocked,
    isMovingToLocation: isMoving,
    moveToLocation: (locationGuid: string) =>
      moveCards({
        guid: locationGuid,
        scanIds: entry.scanIds,
        collectionGuid: viewedCollection?.guid,
      }),
  };
}
