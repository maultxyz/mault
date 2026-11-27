import { useOrg } from "@/features/companies/api/use-organization";
import { apiGet, apiPost } from "@/lib/api/client";
import { TRADE_OFFER_PICK_UNDO_TOAST_ID_PREFIX, TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { toast } from "@/lib/toast";
import {
  TRADE_OFFER_PICK_UNDO_WINDOW_MS,
  rememberTradeOfferPlacements,
  type Result,
  type TradeOffer,
  type TradeOfferPickResult,
} from "@magic-vault/shared";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const pendingTradeOffersQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [TRADE_OFFERS_QUERY_KEY, orgId, "pending"] as const,
    queryFn: async () => {
      const result = await apiGet<Result<TradeOffer[]>>("/api/trade-offers?status=pending");
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

export const tradeOffersQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: [TRADE_OFFERS_QUERY_KEY, orgId, "all"] as const,
    queryFn: async () => {
      const result = await apiGet<Result<TradeOffer[]>>("/api/trade-offers");
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

export function useTradeOffers() {
  const { activeOrg } = useOrg();
  return useQuery(tradeOffersQueryOptions(activeOrg?.id));
}

export function usePendingTradeOffers() {
  const { activeOrg } = useOrg();
  const { data } = useQuery(pendingTradeOffersQueryOptions(activeOrg?.id));
  return data ?? [];
}

export function useRespondToTradeOffer() {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ guid, accepts }: { guid: string; accepts: boolean }) => {
      const result = accepts
        ? await apiPost<Result<{ removedCount: number }>>(`/api/trade-offers/${guid}/accept`, {
            removeWantedCardsWhenPicked: true,
          })
        : await apiPost<Result<{ removedCount: number }>>(`/api/trade-offers/${guid}/decline`);
      if (!result.success) throw new Error(result.message);
      return { accepts };
    },
    onSuccess: ({ accepts }) => {
      toast.success(accepts ? t("tradeOffers.pickList.started") : t("tradeOffers.declined"));
      return queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    },
    onError: (error: Error) => toast.error(error.message || t("tradeOffers.respondFailed")),
  });
}

function storeRemainingPickScanIds(
  queryClient: QueryClient,
  offerGuid: string,
  remainingScanIds: string[],
) {
  queryClient.setQueriesData<TradeOffer[]>({ queryKey: [TRADE_OFFERS_QUERY_KEY] }, (offers) =>
    offers?.map((offer) =>
      offer.guid === offerGuid
        ? { ...offer, remainingPickScanIds: remainingScanIds.length > 0 ? remainingScanIds : null }
        : offer,
    ),
  );
}

export function useTradeOfferPicking(offer: TradeOffer) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const offerGuid = offer.guid;
  const [locallyPickedScanIds, setLocallyPickedScanIds] = useState<ReadonlySet<string>>(new Set());
  const pendingPickTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [placementSource, setPlacementSource] = useState(offer.wantedPlacements);
  const [knownPlacements, setKnownPlacements] = useState(() =>
    rememberTradeOfferPlacements(new Map(), offer),
  );
  if (placementSource !== offer.wantedPlacements) {
    setPlacementSource(offer.wantedPlacements);
    setKnownPlacements(rememberTradeOfferPlacements(knownPlacements, offer));
  }

  const commitPicks = useCallback(async (requestedScanIds: string[]) => {
    const scanIds = requestedScanIds.filter((scanId) => pendingPickTimers.current.has(scanId));
    for (const scanId of scanIds) {
      clearTimeout(pendingPickTimers.current.get(scanId));
      pendingPickTimers.current.delete(scanId);
    }
    if (scanIds.length === 0) return;
    try {
      const result = await apiPost<Result<TradeOfferPickResult>>(
        `/api/trade-offers/${offerGuid}/picked`,
        { scanIds },
      );
      if (!result.success || !result.data) throw new Error(result.message);
      storeRemainingPickScanIds(queryClient, offerGuid, result.data.remainingScanIds);
      void queryClient.invalidateQueries({ queryKey: collectionCardsKeys.root() });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message ? error.message : t("tradeOffers.pickList.pickFailed"),
      );
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    } finally {
      setLocallyPickedScanIds((current) => {
        const next = new Set(current);
        for (const scanId of scanIds) next.delete(scanId);
        return next;
      });
    }
  }, [offerGuid, queryClient, t]);

  const commitPicksRef = useRef(commitPicks);
  useEffect(() => {
    commitPicksRef.current = commitPicks;
  }, [commitPicks]);

  useEffect(() => {
    const timers = pendingPickTimers.current;
    return () => void commitPicksRef.current([...timers.keys()]);
  }, []);

  const undoPick = (scanId: string) => {
    const timer = pendingPickTimers.current.get(scanId);
    if (!timer) return;
    clearTimeout(timer);
    pendingPickTimers.current.delete(scanId);
    setLocallyPickedScanIds((current) => {
      const next = new Set(current);
      next.delete(scanId);
      return next;
    });
  };

  const markPicked = (scanId: string) => {
    if (locallyPickedScanIds.has(scanId)) return;
    setLocallyPickedScanIds((current) => new Set(current).add(scanId));
    pendingPickTimers.current.set(
      scanId,
      setTimeout(() => void commitPicksRef.current([scanId]), TRADE_OFFER_PICK_UNDO_WINDOW_MS),
    );
    const cardName = offer.wanted.find((card) => card.scanId === scanId)?.name ?? "";
    toast.info(t("tradeOffers.pickList.pickedUndoable", { name: cardName }), {
      id: `${TRADE_OFFER_PICK_UNDO_TOAST_ID_PREFIX}${scanId}`,
      duration: TRADE_OFFER_PICK_UNDO_WINDOW_MS,
      action: { label: t("tradeOffers.pickList.undo"), onClick: () => undoPick(scanId) },
    });
  };

  const finish = useMutation({
    mutationFn: async () => {
      for (const timer of pendingPickTimers.current.values()) clearTimeout(timer);
      pendingPickTimers.current.clear();
      const result = await apiPost<Result<TradeOfferPickResult>>(
        `/api/trade-offers/${offerGuid}/finish-picking`,
      );
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
    onSuccess: (data) => {
      storeRemainingPickScanIds(queryClient, offerGuid, data.remainingScanIds);
      toast.success(t("tradeOffers.pickList.finished", { count: data.removedCount }));
      void queryClient.invalidateQueries({ queryKey: collectionCardsKeys.root() });
      return queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      setLocallyPickedScanIds(new Set());
      toast.error(error.message || t("tradeOffers.pickList.finishFailed"));
    },
  });

  const placements = offer.wanted.map((card) => knownPlacements.get(card.scanId) ?? null);
  const remainingScanIds = (offer.remainingPickScanIds ?? []).filter(
    (scanId) => !locallyPickedScanIds.has(scanId),
  );

  return { remainingScanIds, placements, markPicked, finish };
}
