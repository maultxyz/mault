import { apiGet } from "@/lib/api/client";
import { CARD_SETS_STALE_MS } from "@/lib/constants/scanner";
import type { CardSetOption, Result, SetPrintingOption } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const cardSetsQueryOptions = (
  collectionGuid: string | undefined,
  query?: string,
  language?: string,
) =>
  queryOptions({
    queryKey: ["card-sets", collectionGuid, query ?? null, language ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ collectionGuid: collectionGuid ?? "" });
      if (query) params.set("q", query);
      if (language) params.set("lang", language);
      const result = await apiGet<Result<CardSetOption[]>>(
        `/api/cards/sets?${params}`,
      );
      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load sets.");
      }
      return result.data;
    },
    enabled: !!collectionGuid,
    staleTime: CARD_SETS_STALE_MS,
  });

export const setPrintingsQueryOptions = (
  collectionGuid: string | undefined,
  setCode: string | undefined,
) =>
  queryOptions({
    queryKey: ["set-printings", collectionGuid, setCode ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({
        collectionGuid: collectionGuid ?? "",
        set: setCode ?? "",
      });
      const result = await apiGet<Result<SetPrintingOption[]>>(
        `/api/cards/set-printings?${params}`,
      );
      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load cards.");
      }
      return result.data;
    },
    enabled: !!collectionGuid && !!setCode,
    staleTime: CARD_SETS_STALE_MS,
  });
