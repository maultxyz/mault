import { publicCardsKeys } from "@/features/public-cards/api/public-cards";
import { monitorCardsKey, monitorCardsSummaryQueryOptions } from "@/features/scanner/api/monitor-cards";
import { toScanStats } from "@/features/scanner/lib/compute-stats";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { MONITOR_REFRESH_THROTTLE_MS } from "@/lib/constants/timing";
import { PUBLIC_CARD_QUERY_KINDS_REFRESHED_BY_SCANS } from "@/lib/constants/public-cards";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import { createKeyedRefreshThrottle } from "@magic-vault/shared";
import { SCAN_SAVE_CARD_LISTS_REFRESH_MS } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

const throttleScannedCardsRefresh = createKeyedRefreshThrottle(
  SCAN_SAVE_CARD_LISTS_REFRESH_MS,
);

export function useLivePublicCards(
  source: PublicCardsSource,
  token: string,
  collectionGuid: string,
  cardsVersion: number,
  scannedCardsVersion: number,
) {
  const queryClient = useQueryClient();
  const monitorSource = useMemo(
    () => ({ collectionGuid, shareToken: token }),
    [collectionGuid, token],
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
          queryKey: publicCardsKeys.root(source),
        });
        void queryClient.invalidateQueries({ queryKey: monitorCardsKey(monitorSource) });
      },
      Math.max(0, MONITOR_REFRESH_THROTTLE_MS - (Date.now() - lastRefreshAt.current)),
    );
    return () => clearTimeout(timer);
  }, [cardsVersion, queryClient, source, monitorSource]);

  useEffect(() => {
    if (scannedCardsVersion === 0) return;
    throttleScannedCardsRefresh(JSON.stringify(publicCardsKeys.root(source)), () => {
      void queryClient.invalidateQueries({
        queryKey: publicCardsKeys.root(source),
        predicate: (query) =>
          PUBLIC_CARD_QUERY_KINDS_REFRESHED_BY_SCANS.includes(
            String(query.queryKey[3]),
          ),
      });
      void queryClient.invalidateQueries({ queryKey: monitorCardsKey(monitorSource) });
    });
  }, [scannedCardsVersion, queryClient, source, monitorSource]);

  return {
    stats: summary ? toScanStats(summary.all) : null,
    cardCount: summary?.all.totalCount ?? 0,
  };
}
