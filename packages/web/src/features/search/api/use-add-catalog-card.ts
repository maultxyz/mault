import { addManualCollectionCard } from "@/features/collections/api/collections";
import { invalidateCollectionCards } from "@/features/collections/lib/card-page-cache";
import { OWNED_CARD_SEARCH_QUERY_KEY } from "@/lib/constants/search";
import type { AddCatalogCardInput } from "@/lib/interfaces/search";
import type { ScannedCard } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAddCatalogCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionGuid, card }: AddCatalogCardInput): Promise<ScannedCard> => {
      const result = await addManualCollectionCard(collectionGuid, { card });
      if (!result.success || !result.data) throw new Error(result.message ?? "Couldn't add the card.");
      return result.data;
    },
    onSuccess: (_addedCard, { collectionGuid }) => {
      void invalidateCollectionCards(queryClient, collectionGuid);
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: [OWNED_CARD_SEARCH_QUERY_KEY] });
    },
  });
}
