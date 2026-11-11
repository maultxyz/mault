import { publicCardsKeys } from "@/features/public-cards/api/public-cards";
import { monitorCardsKey, monitorCardsSummaryQueryOptions } from "@/features/scanner/api/monitor-cards";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { MONITOR_REFRESH_THROTTLE_MS } from "@/lib/constants/timing";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

export function useLivePublicCards(
  source: PublicCardsSource,
  collectionGuid: string,
  cardsVersion: number,
) {
  const queryClient = useQueryClient();
  const monitorSource = useMemo(
    () => ({ collectionGuid, shareToken: source.token }),
    [collectionGuid, source.token],
  );
  const { data: summary } = useQuery(
    monitorCardsSummaryQueryOptions(monitorSource, ALL_CARDS_QUERY),
  );
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    if (cardsVersion === 0) return;
    const timer = setTimeout(
      () => {
        lastRefreshAt.current = Date.now();
        void queryClient.invalidateQueries({
          queryKey: publicCardsKeys.root(source.basePath, source.token),
        });
        void queryClient.invalidateQueries({ queryKey: monitorCardsKey(monitorSource) });
      },
      Math.max(0, MONITOR_REFRESH_THROTTLE_MS - (Date.now() - lastRefreshAt.current)),
    );
    return () => clearTimeout(timer);
  }, [cardsVersion, queryClient, source.basePath, source.token, monitorSource]);

  return {
    stats: summary ? toScanStats(summary.all) : null,
    cardCount: summary?.all.totalCount ?? 0,
  };
}
