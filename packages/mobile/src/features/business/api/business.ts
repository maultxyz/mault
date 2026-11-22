import {
  BUSINESS_LIST_SEARCH_PARAM,
  BUSINESS_LIST_STATUS_PARAM,
  type BusinessOverview,
  CARD_RESERVATION_LIST_VIEW_PARAM,
  type CardReservation,
  type CardReservationListView,
  type CardReservationPickRequest,
  type CreatedCardReservationPick,
  type CollectedCardReservations,
  type ReleasedCardReservations,
  type FulfilmentOrder,
  type FulfilmentOrderStatus,
  type FulfilmentOrderDetail,
  type FulfilmentOrderInput,
  type FulfilmentOrderUpdateInput,
  type IntakeAcceptInput,
  type IntakeCancelInput,
  type IntakeLot,
  type IntakeLotCard,
  type IntakeLotDetail,
  type IntakeLotInput,
  type IntakeLotStatus,
  type IntakeTransferInput,
  type IntakeTransferResult,
  type OrderFulfilInput,
  type OrderLineSubstitute,
  type OrderLineSubstituteInput,
  type OrderPickedInput,
  type PagedList,
  type Result,
} from "@magic-vault/shared";
import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut, unwrap, unwrapOr } from "@/lib/api/client";
import {
  BUSINESS_RESERVATIONS_QUERY_KEY,
  BUSINESS_INTAKE_QUERY_KEY,
  BUSINESS_OVERVIEW_QUERY_KEY,
  BUSINESS_LIST_PAGE_SIZE,
  BUSINESS_ORDERS_QUERY_KEY,
  INTAKE_LIVE_REFETCH_MS,
  INTAKE_LOT_CARDS_PAGE_SIZE,
} from "@/lib/constants/business";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import type { MobileCardReservationTarget } from "@/lib/interfaces/business";

function nextPageOf<T>(last: PagedList<T>, pages: PagedList<T>[]): number | undefined {
  return pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length + 1 : undefined;
}

function businessListParams(page: number, search: string, status: string | null): string {
  const params = new URLSearchParams({ page: String(page), limit: String(BUSINESS_LIST_PAGE_SIZE) });
  if (search) params.set(BUSINESS_LIST_SEARCH_PARAM, search);
  if (status) params.set(BUSINESS_LIST_STATUS_PARAM, status);
  return params.toString();
}

export const intakeLotsQueryOptions = (
  orgId: string | null,
  enabled: boolean,
  search = "",
  status: IntakeLotStatus | null = null,
) =>
  infiniteQueryOptions({
    queryKey: [...BUSINESS_INTAKE_QUERY_KEY, "list", orgId, search, status] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<PagedList<IntakeLot>>>(`/api/business/intake?${businessListParams(pageParam, search, status)}`),
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageOf<IntakeLot>,
    enabled: !!orgId && enabled,
    staleTime: QUERY_STALE_MS,
  });

export const businessOverviewQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: [...BUSINESS_OVERVIEW_QUERY_KEY, orgId] as const,
    queryFn: () => unwrap(apiGet<Result<BusinessOverview>>("/api/business/overview")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export const intakeLotQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: [...BUSINESS_INTAKE_QUERY_KEY, "lot", guid] as const,
    queryFn: () => unwrap(apiGet<Result<IntakeLotDetail>>(`/api/business/intake/${guid}`)),
    enabled: !!guid,
    refetchInterval: (query) => (query.state.data?.status === "open" ? INTAKE_LIVE_REFETCH_MS : false),
  });

export const intakeLotCardsQueryOptions = (guid: string | undefined, isOpen: boolean) =>
  infiniteQueryOptions({
    queryKey: [...BUSINESS_INTAKE_QUERY_KEY, "lot-cards", guid] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<PagedList<IntakeLotCard>>>(
          `/api/business/intake/${guid}/cards?page=${pageParam}&limit=${INTAKE_LOT_CARDS_PAGE_SIZE}`,
        ),
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageOf<IntakeLotCard>,
    enabled: !!guid,
    refetchInterval: isOpen ? INTAKE_LIVE_REFETCH_MS : false,
  });

export function createIntakeLot(input: IntakeLotInput): Promise<{ guid: string }> {
  return unwrap(apiPost<Result<{ guid: string }>>("/api/business/intake", input));
}

export function acceptIntakeLot(guid: string, input: IntakeAcceptInput): Promise<null> {
  return unwrapOr(apiPost<Result<null>>(`/api/business/intake/${guid}/accept`, input), null);
}

export function transferIntakeLot(guid: string, input: IntakeTransferInput): Promise<IntakeTransferResult> {
  return unwrap(apiPost<Result<IntakeTransferResult>>(`/api/business/intake/${guid}/transfer`, input));
}

export function cancelIntakeLot(guid: string, input: IntakeCancelInput): Promise<null> {
  return unwrapOr(apiPost<Result<null>>(`/api/business/intake/${guid}/cancel`, input), null);
}

export function deleteIntakeLot(guid: string): Promise<null> {
  return unwrapOr(apiDelete<Result<null>>(`/api/business/intake/${guid}`), null);
}

export const ordersQueryOptions = (
  orgId: string | null,
  enabled: boolean,
  search = "",
  status: FulfilmentOrderStatus | null = null,
) =>
  infiniteQueryOptions({
    queryKey: [...BUSINESS_ORDERS_QUERY_KEY, "list", orgId, search, status] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<PagedList<FulfilmentOrder>>>(`/api/business/orders?${businessListParams(pageParam, search, status)}`),
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageOf<FulfilmentOrder>,
    enabled: !!orgId && enabled,
    staleTime: QUERY_STALE_MS,
  });

export const orderQueryKey = (guid: string | undefined) => [...BUSINESS_ORDERS_QUERY_KEY, "order", guid] as const;

export const orderQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: orderQueryKey(guid),
    queryFn: () => unwrap(apiGet<Result<FulfilmentOrderDetail>>(`/api/business/orders/${guid}`)),
    enabled: !!guid,
    staleTime: QUERY_STALE_MS,
  });

export const orderLineSubstitutesQueryOptions = (orderGuid: string | undefined, lineIndex: number | null) =>
  queryOptions({
    queryKey: [...BUSINESS_ORDERS_QUERY_KEY, "substitutes", orderGuid, lineIndex] as const,
    queryFn: () =>
      unwrap(apiGet<Result<OrderLineSubstitute[]>>(`/api/business/orders/${orderGuid}/lines/${lineIndex}/substitutes`)),
    enabled: !!orderGuid && lineIndex !== null,
  });

export function createOrder(input: FulfilmentOrderInput): Promise<{ guid: string }> {
  return unwrap(apiPost<Result<{ guid: string }>>("/api/business/orders", input));
}

export function updateOrder(guid: string, input: FulfilmentOrderUpdateInput): Promise<null> {
  return unwrapOr(apiPut<Result<null>>(`/api/business/orders/${guid}`, input), null);
}

export function allocateOrder(guid: string): Promise<null> {
  return unwrapOr(apiPost<Result<null>>(`/api/business/orders/${guid}/allocate`), null);
}

export function setOrderPicked(guid: string, input: OrderPickedInput): Promise<null> {
  return unwrapOr(apiPut<Result<null>>(`/api/business/orders/${guid}/picked`, input), null);
}

export function substituteOrderLine(guid: string, input: OrderLineSubstituteInput): Promise<null> {
  return unwrapOr(apiPost<Result<null>>(`/api/business/orders/${guid}/substitute`, input), null);
}

export function fulfilOrder(guid: string, input: OrderFulfilInput): Promise<{ sold: number }> {
  return unwrap(apiPost<Result<{ sold: number }>>(`/api/business/orders/${guid}/fulfil`, input));
}

export function cancelOrder(guid: string): Promise<null> {
  return unwrapOr(apiPost<Result<null>>(`/api/business/orders/${guid}/cancel`), null);
}

export function deleteOrder(guid: string): Promise<null> {
  return unwrapOr(apiDelete<Result<null>>(`/api/business/orders/${guid}`), null);
}

export const cardReservationsQueryOptions = (
  orgId: string | null,
  view: CardReservationListView,
  enabled: boolean,
  search = "",
) =>
  queryOptions({
    queryKey: [...BUSINESS_RESERVATIONS_QUERY_KEY, orgId, view, search] as const,
    queryFn: () => {
      const params = new URLSearchParams({ [CARD_RESERVATION_LIST_VIEW_PARAM]: view });
      if (search) params.set(BUSINESS_LIST_SEARCH_PARAM, search);
      return unwrap(apiGet<Result<CardReservation[]>>(`/api/business/reservations?${params}`));
    },
    placeholderData: keepPreviousData,
    enabled: !!orgId && enabled,
    staleTime: QUERY_STALE_MS,
  });

function cardReservationTargetPath(target: MobileCardReservationTarget): string {
  return target.kind === "request"
    ? `/api/business/reservations/requests/${target.requestGuid}`
    : `/api/business/reservations/${target.reservationGuid}`;
}

export function collectCardReservations(target: MobileCardReservationTarget): Promise<CollectedCardReservations> {
  return unwrap(apiPost<Result<CollectedCardReservations>>(`${cardReservationTargetPath(target)}/collect`));
}

export function releaseCardReservations(target: MobileCardReservationTarget): Promise<ReleasedCardReservations> {
  return unwrap(apiPost<Result<ReleasedCardReservations>>(`${cardReservationTargetPath(target)}/release`));
}

export function createCardReservationPick(
  requestGuid: string,
  request: CardReservationPickRequest,
): Promise<CreatedCardReservationPick> {
  return unwrap(
    apiPost<Result<CreatedCardReservationPick>>(`/api/business/reservations/requests/${requestGuid}/pick`, request),
  );
}
