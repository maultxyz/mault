import {
  approveCardHold,
  fetchOwnerCardHolds,
  ownerCardHoldsKey,
  releaseCardHold,
} from "@/features/card-holds/api/card-holds";
import { CARD_HOLDS_QUERY_KEY } from "@/lib/constants/share-links";
import type { CardHoldOwnerScope } from "@/lib/interfaces/card-holds";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useOwnerCardHolds(scope: CardHoldOwnerScope) {
  const queryClient = useQueryClient();
  const holds = useQuery({
    queryKey: ownerCardHoldsKey(scope),
    queryFn: () => fetchOwnerCardHolds(scope),
  });
  const refreshHolds = () =>
    queryClient.invalidateQueries({ queryKey: [CARD_HOLDS_QUERY_KEY] });
  const approveHold = useMutation({
    mutationFn: approveCardHold,
    onSettled: refreshHolds,
  });
  const releaseHold = useMutation({
    mutationFn: releaseCardHold,
    onSettled: refreshHolds,
  });
  return { holds, approveHold, releaseHold };
}
