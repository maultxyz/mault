import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddManualCardRequest, Result, ScannedCard } from "@magic-vault/shared";
import { invalidateCollectionCards } from "@/features/collections/api/collection-cards";
import { apiPost, unwrap } from "@/lib/api/client";
import type { AddCatalogCardInput } from "@/lib/interfaces/cards";

export function useAddCatalogCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionGuid, card }: AddCatalogCardInput) =>
      unwrap(apiPost<Result<ScannedCard>>(`/api/collections/${collectionGuid}/cards/manual`, { card } satisfies AddManualCardRequest)),
    onSuccess: (_card, { collectionGuid }) => {
      invalidateCollectionCards(queryClient, collectionGuid);
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["owned-card-search"] });
    },
  });
}
