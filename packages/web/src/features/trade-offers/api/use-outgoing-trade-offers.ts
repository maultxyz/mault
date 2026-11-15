import { outgoingTradeOffersQueryOptions } from "@/features/trade-offers/api/outgoing-trade-offers";
import { useAuthSession } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export function useOutgoingTradeOffers() {
  const { data } = useAuthSession();
  return useQuery(outgoingTradeOffersQueryOptions(data?.user?.id));
}
