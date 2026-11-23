import { activeAnnouncementsQueryOptions } from "@/features/announcements/api/announcements";
import { cardReservationsKeys } from "@/features/card-reservations/api/card-reservations";
import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { MY_CARD_RESERVATIONS_QUERY_KEY } from "@/lib/constants/card-reservations";
import type { AlertTrayRefresh } from "@/lib/interfaces/alerts";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export function useAlertTrayRefresh(): AlertTrayRefresh {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const queryKeys = [
        activeAnnouncementsQueryOptions.queryKey,
        [TRADE_OFFERS_QUERY_KEY],
        [MY_CARD_RESERVATIONS_QUERY_KEY],
        cardReservationsKeys.root(),
      ];
      await Promise.all(queryKeys.map((queryKey) => queryClient.refetchQueries({ queryKey })));
      return queryKeys.every((queryKey) =>
        queryClient
          .getQueryCache()
          .findAll({ queryKey })
          .every((query) => query.state.status !== "error"),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);
  return { refresh, isRefreshing };
}
