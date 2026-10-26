import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { pageRequestParams } from "@/lib/api/page-request";
import {
  FLEET_REFETCH_MS,
  INTAKE_LIVE_REFETCH_MS,
} from "@/lib/constants/business";
import type { PageRequest } from "@/lib/interfaces/pagination";
import type {
  AccuracyCheckDetail,
  AccuracyCheckInput,
  AccuracyReport,
  AccuracySampleInput,
  ActivityAction,
  ActivityPage,
  BusinessSettings,
  BusinessSettingsResponse,
  CollectionCostInput,
  CollectionCostResult,
  DeviceMaintenanceInput,
  FleetHealth,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  FulfilmentOrderInput,
  IntakeAcceptInput,
  IntakeCancelInput,
  IntakeCardContext,
  IntakeLot,
  IntakeLotDetail,
  IntakeLotInput,
  IntakeReviewCardPage,
  IntakeTransferInput,
  IntakeTransferResult,
  OrderFulfilInput,
  PagedList,
  Result,
  StaffReport,
  StatsRange,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const businessKeys = {
  root: () => ["business"] as const,
  settings: (orgId: string | undefined) =>
    [...businessKeys.root(), "settings", orgId] as const,
  intakeRoot: () => [...businessKeys.root(), "intake"] as const,
  intakeList: (orgId: string | undefined, page: PageRequest) =>
    [...businessKeys.intakeRoot(), "list", orgId, page] as const,
  openIntake: (orgId: string | undefined) =>
    [...businessKeys.intakeRoot(), "open", orgId] as const,
  intakeLot: (guid: string | undefined) =>
    [...businessKeys.intakeRoot(), "lot", guid] as const,
  intakeCard: (
    lotGuid: string | undefined,
    scanId: string | undefined,
    unreviewedOnly: boolean,
  ) =>
    [
      ...businessKeys.intakeRoot(),
      "card",
      lotGuid,
      scanId,
      unreviewedOnly,
    ] as const,
  intakeUnreviewedCards: (lotGuid: string | undefined) =>
    [...businessKeys.intakeRoot(), "unreviewed", lotGuid] as const,
  ordersRoot: () => [...businessKeys.root(), "orders"] as const,
  orderList: (orgId: string | undefined, page: PageRequest) =>
    [...businessKeys.ordersRoot(), "list", orgId, page] as const,
  order: (guid: string | undefined) =>
    [...businessKeys.ordersRoot(), "order", guid] as const,
  reportsRoot: () => [...businessKeys.root(), "reports"] as const,
  staff: (orgId: string | undefined, range: StatsRange) =>
    [...businessKeys.reportsRoot(), "staff", orgId, range] as const,
  activity: (
    orgId: string | undefined,
    page: number,
    user: string | null,
    action: ActivityAction | null,
  ) =>
    [
      ...businessKeys.reportsRoot(),
      "activity",
      orgId,
      page,
      user,
      action,
    ] as const,
  accuracyRoot: () => [...businessKeys.root(), "accuracy"] as const,
  accuracy: (collectionGuid: string | null, lotGuid: string | null) =>
    [
      ...businessKeys.accuracyRoot(),
      "report",
      collectionGuid,
      lotGuid,
    ] as const,
  accuracyCheck: (guid: string | null) =>
    [...businessKeys.accuracyRoot(), "check", guid] as const,
  fleet: (orgId: string | undefined) =>
    [...businessKeys.root(), "fleet", orgId] as const,
};

const unwrap = <T>(result: Result<T>) => result.data ?? null;

export const businessSettingsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.settings(orgId),
    queryFn: () =>
      apiGet<Result<BusinessSettingsResponse>>("/api/business/settings").then(
        unwrap,
      ),
    enabled: !!orgId,
  });

export function saveBusinessSettings(settings: BusinessSettings) {
  return apiPut<Result<BusinessSettings>>("/api/business/settings", settings);
}

export const intakeLotsQueryOptions = (
  orgId: string | undefined,
  page: PageRequest,
) =>
  queryOptions({
    queryKey: businessKeys.intakeList(orgId, page),
    queryFn: () =>
      apiGet<Result<PagedList<IntakeLot>>>(
        `/api/business/intake?${pageRequestParams(page)}`,
      ).then(unwrap),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

export const openIntakeLotsQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.openIntake(orgId),
    queryFn: () =>
      apiGet<Result<IntakeLot[]>>("/api/business/intake/open").then(
        (r) => r.data ?? [],
      ),
    enabled: !!orgId,
  });

export const intakeLotQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.intakeLot(guid),
    queryFn: () =>
      apiGet<Result<IntakeLotDetail>>(`/api/business/intake/${guid}`).then(
        unwrap,
      ),
    enabled: !!guid,
    refetchInterval: (query) =>
      query.state.data?.status === "open" ? INTAKE_LIVE_REFETCH_MS : false,
  });

export const intakeCardContextQueryOptions = (
  lotGuid: string | undefined,
  scanId: string | undefined,
  unreviewedOnly: boolean,
) =>
  queryOptions({
    queryKey: businessKeys.intakeCard(lotGuid, scanId, unreviewedOnly),
    queryFn: () =>
      apiGet<Result<IntakeCardContext | null>>(
        `/api/business/intake/${lotGuid}/cards/${scanId}/context${unreviewedOnly ? "?unreviewedOnly=true" : ""}`,
      ).then((r) => r.data ?? null),
    enabled: !!lotGuid && !!scanId,
  });

export const intakeUnreviewedCardsQueryOptions = (
  lotGuid: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: businessKeys.intakeUnreviewedCards(lotGuid),
    queryFn: () =>
      apiGet<Result<IntakeReviewCardPage>>(
        `/api/business/intake/${lotGuid}/cards/unreviewed`,
      ).then(unwrap),
    enabled: !!lotGuid && enabled,
  });

export function fetchNextUnreviewedIntakeCard(
  lotGuid: string,
): Promise<string | null> {
  return apiGet<Result<string | null>>(
    `/api/business/intake/${lotGuid}/cards/next-unreviewed`,
  ).then((result) => {
    if (!result.success) throw new Error(result.message);
    return result.data ?? null;
  });
}

export function createIntakeLot(input: IntakeLotInput) {
  return apiPost<Result<{ guid: string }>>("/api/business/intake", input);
}

export function acceptIntakeLot(guid: string, input: IntakeAcceptInput) {
  return apiPost<Result<null>>(`/api/business/intake/${guid}/accept`, input);
}

export function transferIntakeLot(guid: string, input: IntakeTransferInput) {
  return apiPost<Result<IntakeTransferResult>>(
    `/api/business/intake/${guid}/transfer`,
    input,
  );
}

export function cancelIntakeLot(guid: string, input: IntakeCancelInput) {
  return apiPost<Result<null>>(`/api/business/intake/${guid}/cancel`, input);
}

export function deleteIntakeLot(guid: string) {
  return apiDelete<Result<null>>(`/api/business/intake/${guid}`);
}

export const ordersQueryOptions = (
  orgId: string | undefined,
  page: PageRequest,
) =>
  queryOptions({
    queryKey: businessKeys.orderList(orgId, page),
    queryFn: () =>
      apiGet<Result<PagedList<FulfilmentOrder>>>(
        `/api/business/orders?${pageRequestParams(page)}`,
      ).then(unwrap),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

export const orderQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.order(guid),
    queryFn: () =>
      apiGet<Result<FulfilmentOrderDetail>>(
        `/api/business/orders/${guid}`,
      ).then(unwrap),
    enabled: !!guid,
  });

export function createOrder(input: FulfilmentOrderInput) {
  return apiPost<Result<{ guid: string }>>("/api/business/orders", input);
}

export function allocateOrder(guid: string) {
  return apiPost<Result<null>>(`/api/business/orders/${guid}/allocate`);
}

export function fulfilOrder(guid: string, input: OrderFulfilInput) {
  return apiPost<Result<{ sold: number }>>(
    `/api/business/orders/${guid}/fulfil`,
    input,
  );
}

export function cancelOrder(guid: string) {
  return apiPost<Result<null>>(`/api/business/orders/${guid}/cancel`);
}

export function deleteOrder(guid: string) {
  return apiDelete<Result<null>>(`/api/business/orders/${guid}`);
}

export function setCollectionCost(
  collectionGuid: string,
  input: CollectionCostInput,
) {
  return apiPost<Result<CollectionCostResult>>(
    `/api/business/cost/${collectionGuid}`,
    input,
  );
}

export const staffReportQueryOptions = (
  orgId: string | undefined,
  range: StatsRange,
) =>
  queryOptions({
    queryKey: businessKeys.staff(orgId, range),
    queryFn: () =>
      apiGet<Result<StaffReport>>(`/api/business/staff?range=${range}`).then(
        unwrap,
      ),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

export const activityQueryOptions = (
  orgId: string | undefined,
  page: number,
  user: string | null,
  action: ActivityAction | null,
) =>
  queryOptions({
    queryKey: businessKeys.activity(orgId, page, user, action),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (user) params.set("user", user);
      if (action) params.set("action", action);
      return apiGet<Result<ActivityPage>>(
        `/api/business/activity?${params.toString()}`,
      ).then(unwrap);
    },
    enabled: !!orgId,
    placeholderData: keepPreviousData,
  });

export const accuracyReportQueryOptions = (
  collectionGuid: string | null,
  lotGuid: string | null,
) =>
  queryOptions({
    queryKey: businessKeys.accuracy(collectionGuid, lotGuid),
    queryFn: () => {
      const params = new URLSearchParams({ collection: collectionGuid ?? "" });
      if (lotGuid) params.set("lot", lotGuid);
      return apiGet<Result<AccuracyReport>>(
        `/api/business/accuracy?${params.toString()}`,
      ).then(unwrap);
    },
    enabled: !!collectionGuid,
  });

export const accuracyCheckQueryOptions = (guid: string | null) =>
  queryOptions({
    queryKey: businessKeys.accuracyCheck(guid),
    queryFn: () =>
      apiGet<Result<AccuracyCheckDetail>>(
        `/api/business/accuracy/checks/${guid}`,
      ).then(unwrap),
    enabled: !!guid,
  });

export function createAccuracyCheck(input: AccuracyCheckInput) {
  return apiPost<Result<{ guid: string }>>(
    "/api/business/accuracy/checks",
    input,
  );
}

export function recordAccuracySample(guid: string, input: AccuracySampleInput) {
  return apiPut<Result<null>>(
    `/api/business/accuracy/checks/${guid}/samples`,
    input,
  );
}

export function completeAccuracyCheck(guid: string) {
  return apiPost<Result<null>>(
    `/api/business/accuracy/checks/${guid}/complete`,
  );
}

export const fleetQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.fleet(orgId),
    queryFn: () =>
      apiGet<Result<FleetHealth>>("/api/business/fleet").then(unwrap),
    enabled: !!orgId,
    refetchInterval: FLEET_REFETCH_MS,
  });

export function setDeviceMaintenance(
  guid: string,
  input: DeviceMaintenanceInput,
) {
  return apiPut<Result<null>>(`/api/business/fleet/${guid}/maintenance`, input);
}

export function markDeviceServiced(guid: string) {
  return apiPost<Result<null>>(`/api/business/fleet/${guid}/serviced`);
}
