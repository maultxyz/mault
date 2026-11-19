import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { activeAnnouncementsQueryOptions } from "@/features/stream/api/announcements";
import { useActiveOrgId } from "@/hooks/use-org";
import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import type { AlertsRefresh } from "@/lib/interfaces/stream";

export function useAlertsRefresh(): AlertsRefresh {
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const queryKeys = [activeAnnouncementsQueryOptions(orgId).queryKey, [TRADE_OFFERS_QUERY_KEY]];
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
  }, [orgId, queryClient]);
  return { refresh, isRefreshing };
}
