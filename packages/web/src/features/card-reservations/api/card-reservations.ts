import { businessKeys } from "@/features/business/api/business";
import { apiGet, apiPost } from "@/lib/api/client";
import { CARD_RESERVATIONS_QUERY_KEY } from "@/lib/constants/card-reservations";
import type { CardReservationActionTarget } from "@/lib/interfaces/card-reservations";
import {
  CARD_RESERVATION_LIST_VIEW_PARAM,
  type CardReservation,
  type CardReservationListView,
  type CardReservationPickRequest,
  type CreatedCardReservationPick,
  type CollectedCardReservations,
  type ReleasedCardReservations,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const cardReservationsKeys = {
  root: () => [...businessKeys.root(), CARD_RESERVATIONS_QUERY_KEY] as const,
  list: (orgId: string | undefined, view: CardReservationListView) =>
    [...cardReservationsKeys.root(), orgId, view] as const,
};

export const cardReservationsQueryOptions = (
  orgId: string | undefined,
  view: CardReservationListView,
) =>
  queryOptions({
    queryKey: cardReservationsKeys.list(orgId, view),
    queryFn: async () => {
      const result = await apiGet<Result<CardReservation[]>>(
        `/api/business/reservations?${CARD_RESERVATION_LIST_VIEW_PARAM}=${view}`,
      );
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!orgId,
  });

function reservationTargetPath(target: CardReservationActionTarget): string {
  return target.kind === "request"
    ? `/api/business/reservations/requests/${target.group.requestGuid}`
    : `/api/business/reservations/${target.reservation.guid}`;
}

export function collectCardReservations(
  target: CardReservationActionTarget,
): Promise<Result<CollectedCardReservations>> {
  return apiPost<Result<CollectedCardReservations>>(`${reservationTargetPath(target)}/collect`, {});
}

export function releaseCardReservations(
  target: CardReservationActionTarget,
): Promise<Result<ReleasedCardReservations>> {
  return apiPost<Result<ReleasedCardReservations>>(`${reservationTargetPath(target)}/release`, {});
}

export function createCardReservationPick(
  requestGuid: string,
  request: CardReservationPickRequest,
): Promise<Result<CreatedCardReservationPick>> {
  return apiPost<Result<CreatedCardReservationPick>>(
    `/api/business/reservations/requests/${requestGuid}/pick`,
    request,
  );
}
