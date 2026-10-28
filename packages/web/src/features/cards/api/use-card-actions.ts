import { useFoilOptions } from "@/features/cards/api/use-foil-options";
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

  return {
    foilOptions: cardFoilTypeOptions(gameFoilOptions, entry.card, entry.foilType),
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
  };
}
