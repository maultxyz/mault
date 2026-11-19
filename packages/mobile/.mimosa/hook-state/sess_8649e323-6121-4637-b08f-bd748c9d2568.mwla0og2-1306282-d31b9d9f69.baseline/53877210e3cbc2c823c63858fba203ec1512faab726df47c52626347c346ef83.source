import {
  CLAIM_OUTGOING_TRADE_OFFERS_API_PATH,
  OUTGOING_TRADE_OFFERS_API_PATH,
  SHARE_LINK_GUEST_KEY_HEADER,
  type OutgoingTradeOffer,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { tradeGuestKey } from "@/features/trade-offers/lib/guest-key";
import { ApiStatusError } from "@/lib/api/api-status-error";
import { apiRequest, unwrap } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/config";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import { OUTGOING_TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";

const claimsByUserId = new Map<string, Promise<void>>();

async function claimOutgoingTradeOffers(): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  const response = await fetch(`${API_BASE}${CLAIM_OUTGOING_TRADE_OFFERS_API_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      [SHARE_LINK_GUEST_KEY_HEADER]: tradeGuestKey(),
    },
  });
  if (!response.ok) throw new ApiStatusError(response.status);
}

export function claimOutgoingTradeOffersOnce(userId: string): Promise<void> {
  const existing = claimsByUserId.get(userId);
  if (existing) return existing;
  const claim = claimOutgoingTradeOffers().catch(() => {
    claimsByUserId.delete(userId);
  });
  claimsByUserId.set(userId, claim);
  return claim;
}

export const outgoingTradeOffersQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: [OUTGOING_TRADE_OFFERS_QUERY_KEY, userId] as const,
    queryFn: async () => {
      if (userId) await claimOutgoingTradeOffersOnce(userId);
      return unwrap(apiRequest<Result<OutgoingTradeOffer[]>>(OUTGOING_TRADE_OFFERS_API_PATH, { orgId: null }));
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_MS,
  });
