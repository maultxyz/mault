import {
  TRADE_OFFER_PICK_FLUSH_DELAY_MS,
  rememberTradeOfferPlacements,
  type TradeOffer,
} from "@magic-vault/shared";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import {
  finishTradeOfferPicking,
  markTradeOfferCardsPicked,
} from "@/features/trade-offers/api/trade-offers";
import { COLLECTION_CARDS_QUERY_ROOT, TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import type { TradeOfferPicking } from "@/lib/interfaces/trade-offers";

function storeRemainingPickScanIds(queryClient: QueryClient, offerGuid: string, remainingScanIds: string[]) {
  queryClient.setQueriesData<TradeOffer[]>({ queryKey: [TRADE_OFFERS_QUERY_KEY] }, (offers) =>
    offers?.map((offer) =>
      offer.guid === offerGuid
        ? { ...offer, remainingPickScanIds: remainingScanIds.length > 0 ? remainingScanIds : null }
        : offer,
    ),
  );
}

export function useTradeOfferPicking(offer: TradeOffer): TradeOfferPicking {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const offerGuid = offer.guid;
  const [locallyPickedScanIds, setLocallyPickedScanIds] = useState<ReadonlySet<string>>(new Set());
  const [pickError, setPickError] = useState<string | null>(null);
  const [placementSource, setPlacementSource] = useState(offer.wantedPlacements);
  const [knownPlacements, setKnownPlacements] = useState(() => rememberTradeOfferPlacements(new Map(), offer));
  const queuedScanIds = useRef<string[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (placementSource !== offer.wantedPlacements) {
    setPlacementSource(offer.wantedPlacements);
    setKnownPlacements(rememberTradeOfferPlacements(knownPlacements, offer));
  }

  const flushQueuedPicks = useCallback(async () => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    const scanIds = queuedScanIds.current;
    queuedScanIds.current = [];
    if (scanIds.length === 0) return;
    try {
      const result = await markTradeOfferCardsPicked(offerGuid, scanIds);
      storeRemainingPickScanIds(queryClient, offerGuid, result.remainingScanIds);
      void queryClient.invalidateQueries({ queryKey: [COLLECTION_CARDS_QUERY_ROOT] });
    } catch {
      const message = t("tradeOffers.pickList.pickFailed");
      setPickError(message);
      AccessibilityInfo.announceForAccessibility(message);
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    } finally {
      setLocallyPickedScanIds((current) => {
        const next = new Set(current);
        for (const scanId of scanIds) next.delete(scanId);
        return next;
      });
    }
  }, [offerGuid, queryClient, t]);

  useEffect(() => () => void flushQueuedPicks(), [flushQueuedPicks]);

  const markPicked = (scanId: string) => {
    if (locallyPickedScanIds.has(scanId)) return;
    setPickError(null);
    setLocallyPickedScanIds((current) => new Set(current).add(scanId));
    queuedScanIds.current = [...queuedScanIds.current, scanId];
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flushQueuedPicks(), TRADE_OFFER_PICK_FLUSH_DELAY_MS);
  };

  const finish = useMutation({
    mutationFn: () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = null;
      queuedScanIds.current = [];
      setPickError(null);
      return finishTradeOfferPicking(offerGuid);
    },
    onSuccess: (data) => {
      storeRemainingPickScanIds(queryClient, offerGuid, data.remainingScanIds);
      AccessibilityInfo.announceForAccessibility(t("tradeOffers.pickList.finished", { count: data.removedCount }));
      void queryClient.invalidateQueries({ queryKey: [COLLECTION_CARDS_QUERY_ROOT] });
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    },
    onError: () => {
      setLocallyPickedScanIds(new Set());
      const message = t("tradeOffers.pickList.finishFailed");
      setPickError(message);
      AccessibilityInfo.announceForAccessibility(message);
    },
  });

  return {
    remainingScanIds: (offer.remainingPickScanIds ?? []).filter((scanId) => !locallyPickedScanIds.has(scanId)),
    placements: offer.wanted.map((card) => knownPlacements.get(card.scanId) ?? null),
    pickError,
    markPicked,
    finish: () => finish.mutate(),
    isFinishing: finish.isPending,
  };
}
