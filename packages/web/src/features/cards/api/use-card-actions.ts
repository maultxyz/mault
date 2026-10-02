import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { toast } from "@/lib/toast";
import type { GroupedScannedCard } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function useCardActions(entry: GroupedScannedCard) {
  const { t } = useTranslation("cards");
  const { confirmCard, setCardFoilType, removeCards } = useScannedCards();
  const foilOptions = useFoilOptions();

  return {
    foilOptions,
    canConfirm:
      (entry.needsReview || !!entry.alternativeMatches?.length) &&
      !entry.corrected,
    currentFoil: entry.foilType ?? (entry.isFoil ? t("foil") : null),
    confirm: () => {
      for (const scanId of entry.scanIds) confirmCard(scanId);
    },
    setFoil: (foilType: string | null) => {
      for (const scanId of entry.scanIds) setCardFoilType(scanId, foilType);
    },
    copyName: async () => {
      try {
        await navigator.clipboard.writeText(entry.card.name);
        toast.success(t("cardContextMenu.copied"));
      } catch {
        toast.error(t("cardContextMenu.copyFailed"));
      }
    },
    remove: () => removeCards(entry.scanIds),
  };
}
