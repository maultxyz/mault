import { businessKeys } from "@/features/business/api/business";
import {
  confirmCollectionCard,
  markCollectionCardReviewed,
  setCollectionCardCondition,
  setCollectionCardLanguage,
  setCollectionCardFoilType,
  updateCollectionCard,
} from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import type { CardDetailActions } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import type { IntakeReviewCard, Result } from "@magic-vault/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useIntakeCardActions(
  entry: IntakeReviewCard | null,
): CardDetailActions {
  const { t } = useTranslation("business");
  const queryClient = useQueryClient();

  const run = (
    action: (collectionGuid: string) => Promise<Result<unknown>>,
  ) => {
    if (!entry) return;
    void action(entry.collectionGuid)
      .then((result) => {
        if (!result.success) toast.error(result.message || t("errors.generic"));
      })
      .catch(() => toast.error(t("errors.generic")))
      .finally(() => {
        void queryClient.invalidateQueries({
          queryKey: businessKeys.intakeRoot(),
        });
        void invalidateCollectionCards(queryClient, entry.collectionGuid);
      });
  };

  return {
    correctCard: (scanId, card) =>
      run((guid) =>
        updateCollectionCard(guid, scanId, {
          ...card,
          distance: 0,
          confidence: 1,
        }),
      ),
    confirmCard: (scanId) => run((guid) => confirmCollectionCard(guid, scanId)),
    markCardReviewed: (scanId) =>
      run((guid) => markCollectionCardReviewed(guid, scanId)),
    setCardFoilType: (scanId, foilType) =>
      run((guid) =>
        setCollectionCardFoilType(guid, scanId, foilType != null, foilType),
      ),
    setCardCondition: (scanId, condition) =>
      run((guid) => setCollectionCardCondition(guid, scanId, condition)),
    setCardLanguage: (scanId, language) =>
      run((guid) => setCollectionCardLanguage(guid, scanId, language)),
  };
}
