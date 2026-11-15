import { shareLinkGuestKey } from "@/features/trade-offers/lib/guest-identity";
import { apiGet } from "@/lib/api/client";
import { getAuthSession } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/api";
import { OUTGOING_TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import {
  CLAIM_OUTGOING_TRADE_OFFERS_API_PATH,
  OUTGOING_TRADE_OFFERS_API_PATH,
  SHARE_LINK_GUEST_KEY_HEADER,
  type OutgoingTradeOffer,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

const claimedGuestKeysByUser = new Map<string, Promise<void>>();

async function claimOutgoingTradeOffers(): Promise<void> {
  const session = await getAuthSession();
  if (!session?.token) return;
  const response = await fetch(`${API_BASE}${CLAIM_OUTGOING_TRADE_OFFERS_API_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey(),
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
}

export function claimOutgoingTradeOffersOnce(userId: string): Promise<void> {
  const existing = claimedGuestKeysByUser.get(userId);
  if (existing) return existing;
  const claim = claimOutgoingTradeOffers().catch(() => {
    claimedGuestKeysByUser.delete(userId);
  });
  claimedGuestKeysByUser.set(userId, claim);
  return claim;
}

export const outgoingTradeOffersQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: [OUTGOING_TRADE_OFFERS_QUERY_KEY, userId] as const,
    queryFn: async () => {
      if (userId) await claimOutgoingTradeOffersOnce(userId);
      const result = await apiGet<Result<OutgoingTradeOffer[]>>(OUTGOING_TRADE_OFFERS_API_PATH);
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!userId,
  });
