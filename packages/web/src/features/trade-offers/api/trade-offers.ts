import { useOrg } from "@/features/companies/api/use-organization";
import { apiGet, apiPost } from "@/lib/api/client";
import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { toast } from "@/lib/toast";
import type { Result, TradeOffer } from "@magic-vault/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      const result = await apiPost<Result<{ removedCount: number }>>(
        `/api/trade-offers/${guid}/${accepts ? "accept" : "decline"}`,
      );
      if (!result.success) throw new Error(result.message);
      return { accepts, removedCount: result.data?.removedCount ?? 0 };
    },
    onSuccess: ({ accepts, removedCount }) => {
      toast.success(
        accepts
          ? t("tradeOffers.acceptedRemoved", { count: removedCount })
          : t("tradeOffers.declined"),
      );
      void queryClient.invalidateQueries({ queryKey: collectionCardsKeys.root() });
      return queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    },
    onError: (error: Error) => toast.error(error.message || t("tradeOffers.respondFailed")),
  });
}
