import { queryOptions } from "@tanstack/react-query";
import type { CardSetOption, Result } from "@magic-vault/shared";
import { apiGet, unwrapOr } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const cardSetsQueryOptions = (collectionGuid: string | null) =>
  queryOptions({
    queryKey: ["card-sets", collectionGuid] as const,
    queryFn: () =>
      unwrapOr(
        apiGet<Result<CardSetOption[]>>(`/api/cards/sets?${new URLSearchParams({ collectionGuid: collectionGuid ?? "" })}`),
        [],
      ),
    enabled: !!collectionGuid,
    staleTime: QUERY_STALE_MS,
  });
