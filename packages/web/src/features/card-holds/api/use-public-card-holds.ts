import {
  fetchPublicCardHolds,
  placePublicCardHold,
  releasePublicCardHold,
} from "@/features/card-holds/api/card-holds";
import {
  CARD_HOLDS_REFETCH_INTERVAL_MS,
  PUBLIC_CARD_HOLDS_QUERY_KEY,
} from "@/lib/constants/share-links";
import type { CardHoldRequest, CardHoldShareLinkKind } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePublicCardHolds(
  kind: CardHoldShareLinkKind,
  token: string,
  isEnabled: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = [PUBLIC_CARD_HOLDS_QUERY_KEY, kind, token];
  const holds = useQuery({
    queryKey,
    queryFn: () => fetchPublicCardHolds(kind, token),
    enabled: isEnabled,
    refetchInterval: CARD_HOLDS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const refreshHolds = () => queryClient.invalidateQueries({ queryKey });
  const placeHold = useMutation({
    mutationFn: (request: CardHoldRequest) => placePublicCardHold(kind, token, request),
    onSettled: refreshHolds,
  });
  const releaseHold = useMutation({
    mutationFn: (scanId: string) => releasePublicCardHold(kind, token, scanId),
    onSettled: refreshHolds,
  });
  return { holds: holds.data ?? [], placeHold, releaseHold };
}
