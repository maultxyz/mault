import { businessKeys } from "@/features/business/api/business";
import { addManualCollectionCard } from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { storageLocationKeys } from "@/features/storage/api/storage-locations";
import type { AddManualCardInput } from "@/lib/interfaces/cards";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useAddManualCard() {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();
  const { promptAddedCardBin } = useScannedCards();

  const mutation = useMutation({
    mutationFn: ({ collectionGuid, card, locationGuid }: AddManualCardInput) =>
      addManualCollectionCard(collectionGuid, { card, locationGuid }),
    onSuccess: (
      result,
      { collectionGuid, card, locationGuid, addsToIntakeLot },
    ) => {
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("addCard.failed"));
        return;
      }
      if (
        locationGuid ||
        addsToIntakeLot ||
        !promptAddedCardBin(collectionGuid, result.data)
      ) {
        toast.success(t("addCard.added", { name: card.name }));
      }
      void invalidateCollectionCards(queryClient, collectionGuid);
      if (locationGuid) {
        void queryClient.invalidateQueries({
          queryKey: storageLocationKeys.root(),
        });
      }
      if (addsToIntakeLot) {
        void queryClient.invalidateQueries({
          queryKey: businessKeys.intakeRoot(),
        });
      }
    },
    onError: () => toast.error(t("addCard.failed")),
  });

  const addCard = async (input: AddManualCardInput) => {
    const result = await mutation.mutateAsync(input).catch(() => null);
    return !!result?.success;
  };

  return { addCard, isAdding: mutation.isPending };
}
