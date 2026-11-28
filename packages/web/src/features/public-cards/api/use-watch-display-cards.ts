import { publicCardsPageQueryOptions } from "@/features/public-cards/api/public-cards";
import { useLivePublicCards } from "@/features/public-cards/api/use-live-public-cards";
import { toPublicCard } from "@/features/public-cards/lib/scanned-public-card";
import { WATCH_DISPLAY_CARD_COUNT } from "@/lib/constants/public-cards";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import type { SessionMonitorState } from "@/lib/interfaces/scanner";
import { EMPTY_PUBLIC_CARD_FILTERS, type PublicCard } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useWatchDisplayCards(
  source: PublicCardsSource,
  token: string,
  collectionGuid: string,
  session: SessionMonitorState,
) {
  const live = useLivePublicCards(
    source,
    token,
    collectionGuid,
    session.cardsVersion,
    session.scannedCardsVersion,
  );
  const newestCards = useQuery(
    publicCardsPageQueryOptions(source, {
      page: 1,
      pageSize: WATCH_DISPLAY_CARD_COUNT,
      sort: "newest",
      search: "",
      gameKey: null,
      filters: EMPTY_PUBLIC_CARD_FILTERS,
    }),
  );

  const cards = useMemo(() => {
    const seenScanIds = new Set<string>();
    const newestFirst: PublicCard[] = [];
    for (const entry of [
      ...session.recentCards.map(toPublicCard),
      ...(newestCards.data?.cards ?? []),
    ]) {
      if (seenScanIds.has(entry.scanId)) continue;
      seenScanIds.add(entry.scanId);
      newestFirst.push(entry);
    }
    return newestFirst.slice(0, WATCH_DISPLAY_CARD_COUNT);
  }, [session.recentCards, newestCards.data]);

  return {
    newestCard: cards[0] ?? null,
    recentCards: cards.slice(1),
    cardCount: live.cardCount,
    isLoading: newestCards.isPending,
  };
}
