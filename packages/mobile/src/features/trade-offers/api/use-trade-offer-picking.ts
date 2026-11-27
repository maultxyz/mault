import { TRADE_OFFER_PICK_UNDO_WINDOW_MS, rememberTradeOfferPlacements, type TradeOffer } from "@magic-vault/shared";
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

function withoutScanIds(current: ReadonlySet<string>, scanIds: string[]): ReadonlySet<string> {
  const next = new Set(current);
  for (const scanId of scanIds) next.delete(scanId);
  return next;
}

export function useTradeOfferPicking(offer: TradeOffer): TradeOfferPicking {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const offerGuid = offer.guid;
  const [locallyPickedScanIds, setLocallyPickedScanIds] = useState<ReadonlySet<string>>(new Set());
  const [pickError, setPickError] = useState<string | null>(null);
  const [placementSource, setPlacementSource] = useState(offer.wantedPlacements);
  const [knownPlacements, setKnownPlacements] = useState(() => rememberTradeOfferPlacements(new Map(), offer));
  const [undoablePickScanIds, setUndoablePickScanIds] = useState<ReadonlySet<string>>(new Set());
  const pendingPickTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  if (placementSource !== offer.wantedPlacements) {
    setPlacementSource(offer.wantedPlacements);
    setKnownPlacements(rememberTradeOfferPlacements(knownPlacements, offer));
  }

  const commitPicks = useCallback(
    async (scanIds: string[]) => {
      const pendingScanIds = scanIds.filter((scanId) => pendingPickTimers.current.has(scanId));
      for (const scanId of pendingScanIds) {
        clearTimeout(pendingPickTimers.current.get(scanId));
        pendingPickTimers.current.delete(scanId);
      }
      if (pendingScanIds.length === 0) return;
      setUndoablePickScanIds((current) => withoutScanIds(current, pendingScanIds));
      try {
        const result = await markTradeOfferCardsPicked(offerGuid, pendingScanIds);
        storeRemainingPickScanIds(queryClient, offerGuid, result.remainingScanIds);
        void queryClient.invalidateQueries({ queryKey: [COLLECTION_CARDS_QUERY_ROOT] });
      } catch {
        const message = t("tradeOffers.pickList.pickFailed");
        setPickError(message);
        AccessibilityInfo.announceForAccessibility(message);
        void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
      } finally {
        setLocallyPickedScanIds((current) => withoutScanIds(current, pendingScanIds));
      }
    },
    [offerGuid, queryClient, t],
  );
  const commitPicksRef = useRef(commitPicks);
  commitPicksRef.current = commitPicks;

  useEffect(() => {
    const timers = pendingPickTimers.current;
    return () => void commitPicksRef.current([...timers.keys()]);
  }, []);

  const markPicked = (scanId: string) => {
    if (locallyPickedScanIds.has(scanId)) return;
    setPickError(null);
    setLocallyPickedScanIds((current) => new Set(current).add(scanId));
    setUndoablePickScanIds((current) => new Set(current).add(scanId));
    pendingPickTimers.current.set(
      scanId,
      setTimeout(() => void commitPicksRef.current([scanId]), TRADE_OFFER_PICK_UNDO_WINDOW_MS),
    );
  };

  const undoPick = (scanId: string) => {
    const timer = pendingPickTimers.current.get(scanId);
    if (!timer) return;
    clearTimeout(timer);
    pendingPickTimers.current.delete(scanId);
    setUndoablePickScanIds((current) => withoutScanIds(current, [scanId]));
    setLocallyPickedScanIds((current) => withoutScanIds(current, [scanId]));
    AccessibilityInfo.announceForAccessibility(t("tradeOffers.pickList.pickUndone"));
  };

  const finish = useMutation({
    mutationFn: () => {
      for (const timer of pendingPickTimers.current.values()) clearTimeout(timer);
      pendingPickTimers.current.clear();
      setUndoablePickScanIds(new Set());
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
    undoablePickScanIds,
    markPicked,
    undoPick,
    finish: () => finish.mutate(),
    isFinishing: finish.isPending,
  };
}
