import { apiGet } from "@/lib/api/client";
import { CARD_SETS_STALE_MS } from "@/lib/constants/scanner";
import type { CardSetOption, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const cardSetsQueryOptions = (collectionGuid: string | undefined) =>
  queryOptions({
    queryKey: ["card-sets", collectionGuid],
    queryFn: async () => {
      const result = await apiGet<Result<CardSetOption[]>>(
        `/api/cards/sets?${new URLSearchParams({ collectionGuid: collectionGuid ?? "" })}`,
      );
      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load sets.");
      }
      return result.data;
    },
    enabled: !!collectionGuid,
    staleTime: CARD_SETS_STALE_MS,
  });
