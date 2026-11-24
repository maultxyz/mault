import type { CardPriceHistory, Result } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiGet, unwrap } from "@/lib/api/client";
import { CARD_PRICE_HISTORY_QUERY_KEY, CARD_PRICE_HISTORY_STALE_MS } from "@/lib/constants/cards";
import type { CardPriceHistoryRequest } from "@/lib/interfaces/cards";

export const cardPriceHistoryQueryOptions = ({ gameKey, lang, cardId }: CardPriceHistoryRequest) =>
  queryOptions({
    queryKey: [CARD_PRICE_HISTORY_QUERY_KEY, gameKey, lang, cardId] as const,
    queryFn: () => {
      const params = new URLSearchParams({ gameKey, lang, cardId });
      return unwrap(apiGet<Result<CardPriceHistory>>(`/api/cards/price-history?${params}`));
    },
    staleTime: CARD_PRICE_HISTORY_STALE_MS,
  });
