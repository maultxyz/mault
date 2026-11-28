import { apiDelete, apiGet, apiGetBlob, apiPost, apiPostBlob, apiPut } from "@/lib/api/client";
import { pageRequestParams } from "@/lib/api/page-request";
import {
  FLEET_REFETCH_MS,
  INTAKE_BANNER_REFETCH_MS,
  INTAKE_LOT_CARDS_PAGE_SIZE,
  INTAKE_LIVE_REFETCH_MS,
} from "@/lib/constants/business";
import type { SalesReportFilters } from "@/lib/interfaces/business";
import type { PageRequest } from "@/lib/interfaces/pagination";
import type {
  AccuracyCheckDetail,
  AccuracyCheckInput,
  AccuracyReport,
  AccuracySampleInput,
  ActivityAction,
  ActivityPage,
  BusinessOverview,
  CardCostRequest,
  CardPricesUpdateResult,
  CardPricing,
  CardSellPriceRequest,
  BusinessSettings,
  BusinessSettingsResponse,
  BuyPerformance,
  CardAcquisitionCost,
  CardAcquisitionCostInput,
  DeviceMaintenanceInput,
  FleetHealth,
  FulfilmentOrder,
  FulfilmentOrderDetail,
  FulfilmentOrderInput,
  FulfilmentOrderUpdateInput,
  IntakeAcceptInput,
  IntakeCancelInput,
  IntakeCardContext,
  IntakeLot,
  IntakeLotCard,
  IntakeLotDetail,
  IntakeLotReceipt,
  IntakeLotInput,
  IntakeReviewCardPage,
  IntakeTransferInput,
  IntakeTransferResult,
  InventoryMargin,
  OrderBinsInput,
  OrderFulfilInput,
  OrderPickedInput,
  OrderSortPresetResult,
  OrderBulkActionInput,
  OrderBulkActionResult,
  PreviousSortPresetsResult,
  OrderLineSubstitute,
  OrderLineSubstituteInput,
  PagedList,
  PriceLabelCardsResponse,
  PriceLabelSource,
  Result,
  SalesReport,
  StaffReport,
  UnmovedBuy,
  SorterPickApplyInput,
  SorterPickApplyResult,
  SorterPickCleanupResult,
  SorterPickReleaseInput,
  SorterPickReleaseResult,
  StatsRange,
  PosExportRequest,
} from "@magic-vault/shared";
import {
  SALES_REPORT_BUY_PARAM,
  SALES_REPORT_FROM_PARAM,
  SALES_REPORT_TO_PARAM,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const businessKeys = {
  root: () => ["business"] as const,
  settings: (orgId: string | undefined) =>
    [...businessKeys.root(), "settings", orgId] as const,
  cardCost: (orgId: string | undefined, scanId: string | undefined) =>
    [...businessKeys.root(), "card-cost", orgId, scanId] as const,
  cardPricing: (orgId: string | undefined, scanId: string | undefined) =>
    [...businessKeys.root(), "card-pricing", orgId, scanId] as const,
  overview: (orgId: string | undefined) =>
    [...businessKeys.root(), "overview", orgId] as const,
  intakeRoot: () => [...businessKeys.root(), "intake"] as const,
  intakeList: (orgId: string | undefined, page: PageRequest) =>
    [...businessKeys.intakeRoot(), "list", orgId, page] as const,
  openIntake: (orgId: string | undefined) =>
    [...businessKeys.intakeRoot(), "open", orgId] as const,
  intakeLot: (guid: string | undefined) =>
    [...businessKeys.intakeRoot(), "lot", guid] as const,
  intakeLotCards: (guid: string | undefined, page: number) =>
    [...businessKeys.intakeRoot(), "lot-cards", guid, page] as const,
  intakeLotReceipt: (guid: string | undefined) =>
    [...businessKeys.intakeRoot(), "receipt", guid] as const,
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
  unmovedBuys: (orgId: string | undefined) =>
    [...businessKeys.intakeRoot(), "unmoved", orgId] as const,
  buyPerformanceRoot: () => [...businessKeys.root(), "buy-performance"] as const,
  buyPerformance: (guid: string | undefined) =>
    [...businessKeys.buyPerformanceRoot(), guid] as const,
  salesRoot: () => [...businessKeys.root(), "sales"] as const,
  sales: (orgId: string | undefined, filters: SalesReportFilters, page: number) =>
    [...businessKeys.salesRoot(), orgId, filters, page] as const,
  inventoryMargin: (orgId: string | undefined) =>
    [...businessKeys.root(), "inventory-margin", orgId] as const,
  ordersRoot: () => [...businessKeys.root(), "orders"] as const,
  orderList: (orgId: string | undefined, page: PageRequest) =>
    [...businessKeys.ordersRoot(), "list", orgId, page] as const,
  order: (guid: string | undefined) =>
    [...businessKeys.ordersRoot(), "order", guid] as const,
  orderSubstitutes: (guid: string, lineIndex: number | null) =>
    [...businessKeys.ordersRoot(), "substitutes", guid, lineIndex] as const,
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
  priceLabelCards: (
    orgId: string | undefined,
    source: PriceLabelSource | null,
    sourceGuid: string | null,
  ) =>
    [...businessKeys.root(), "price-labels", orgId, source, sourceGuid] as const,
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

export const cardPricingQueryOptions = (
  orgId: string | undefined,
  scanId: string | undefined,
) =>
  queryOptions({
    queryKey: businessKeys.cardPricing(orgId, scanId),
    queryFn: () =>
      apiGet<Result<CardPricing>>(`/api/business/cards/${scanId}/pricing`).then(
        (result) => (result.success ? (result.data ?? null) : null),
      ),
    enabled: !!orgId && !!scanId,
  });

export function setCardSellPrice(request: CardSellPriceRequest) {
  return apiPut<Result<CardPricesUpdateResult>>("/api/business/cards/sell-price", request);
}

export function setCardCost(request: CardCostRequest) {
  return apiPut<Result<CardPricesUpdateResult>>("/api/business/cards/cost", request);
}

export function saveBusinessSettings(settings: BusinessSettings) {
  return apiPut<Result<BusinessSettings>>("/api/business/settings", settings);
}

export const businessOverviewQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.overview(orgId),
    queryFn: () =>
      apiGet<Result<BusinessOverview>>("/api/business/overview").then(unwrap),
    enabled: !!orgId,
  });

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
    refetchInterval: (query) =>
      query.state.data?.some((lot) => lot.status === "open")
        ? INTAKE_BANNER_REFETCH_MS
        : false,
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

export const intakeLotCardsQueryOptions = (
  guid: string | undefined,
  page: number,
  isOpen: boolean,
) =>
  queryOptions({
    queryKey: businessKeys.intakeLotCards(guid, page),
    queryFn: () =>
      apiGet<Result<PagedList<IntakeLotCard>>>(
        `/api/business/intake/${guid}/cards?${new URLSearchParams({
          page: String(page),
          limit: String(INTAKE_LOT_CARDS_PAGE_SIZE),
        })}`,
      ).then(unwrap),
    enabled: !!guid,
    placeholderData: keepPreviousData,
    refetchInterval: isOpen ? INTAKE_LIVE_REFETCH_MS : false,
  });

export const intakeLotReceiptQueryOptions = (guid: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.intakeLotReceipt(guid),
    queryFn: () =>
      apiGet<Result<IntakeLotReceipt>>(
        `/api/business/intake/${guid}/receipt`,
      ).then(unwrap),
    enabled: !!guid,
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

export async function fetchIntakeUnreviewedCardPage(
  lotGuid: string,
  page: number,
): Promise<IntakeReviewCardPage["cards"]> {
  const result = await apiGet<Result<IntakeReviewCardPage>>(
    `/api/business/intake/${lotGuid}/cards/unreviewed?page=${page}`,
  );
  if (!result.success || !result.data) throw new Error(result.message);
  return result.data.cards;
}

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

export function updateOrder(guid: string, input: FulfilmentOrderUpdateInput) {
  return apiPut<Result<null>>(`/api/business/orders/${guid}`, input);
}

export const orderLineSubstitutesQueryOptions = (
  orderGuid: string,
  lineIndex: number | null,
) =>
  queryOptions({
    queryKey: businessKeys.orderSubstitutes(orderGuid, lineIndex),
    queryFn: () =>
      apiGet<Result<OrderLineSubstitute[]>>(
        `/api/business/orders/${orderGuid}/lines/${lineIndex}/substitutes`,
      ).then(unwrap),
    enabled: lineIndex !== null,
  });

export function substituteOrderLine(orderGuid: string, input: OrderLineSubstituteInput) {
  return apiPost<Result<null>>(`/api/business/orders/${orderGuid}/substitute`, input);
}

export function runOrderBulkAction(input: OrderBulkActionInput) {
  return apiPost<Result<OrderBulkActionResult>>("/api/business/orders/bulk", input);
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

export function setOrderPicked(guid: string, input: OrderPickedInput) {
  return apiPut<Result<null>>(`/api/business/orders/${guid}/picked`, input);
}

export function updateOrderBins(guid: string, input: OrderBinsInput) {
  return apiPut<Result<null>>(`/api/business/orders/${guid}/order-bins`, input);
}

export function createOrderSortPreset(guid: string) {
  return apiPost<Result<OrderSortPresetResult>>(
    `/api/business/orders/${guid}/sort-preset`,
  );
}

export function createPickRunSortPreset(
  orderGuids: string[],
  deviceGuid?: string,
  previousPresetGuid?: string,
) {
  return apiPost<Result<OrderSortPresetResult>>(
    "/api/business/pick-runs/sort-preset",
    { orderGuids, deviceGuid, previousPresetGuid },
  );
}

export function previousSortPresetsQueryOptions(orderGuids: string[]) {
  return queryOptions({
    queryKey: [...businessKeys.ordersRoot(), "previousPresets", orderGuids] as const,
    queryFn: async () => {
      const result = await apiGet<Result<PreviousSortPresetsResult>>(
        `/api/business/pick-runs/previous-presets?orderGuids=${orderGuids.join(",")}`,
      );
      return unwrap(result)?.presets;
    },
    enabled: orderGuids.length > 0,
  });
}

export function createSorterPickRun(
  orderGuids: string[],
  locationGuid: string,
  deviceGuid?: string,
) {
  return apiPost<Result<OrderSortPresetResult>>(
    "/api/business/pick-runs/sorter-pick",
    { orderGuids, locationGuid, deviceGuid },
  );
}

export function applySorterPickRun(input: SorterPickApplyInput) {
  return apiPost<Result<SorterPickApplyResult>>(
    "/api/business/pick-runs/sorter-pick/apply",
    input,
  );
}

export function cleanupUsedPresets() {
  return apiPost<Result<SorterPickCleanupResult>>(
    "/api/business/pick-runs/presets/cleanup",
  );
}

export function releaseSorterPickMissing(input: SorterPickReleaseInput) {
  return apiPost<Result<SorterPickReleaseResult>>(
    "/api/business/pick-runs/sorter-pick/release",
    input,
  );
}

export function cancelOrder(guid: string) {
  return apiPost<Result<null>>(`/api/business/orders/${guid}/cancel`);
}

export function deleteOrder(guid: string) {
  return apiDelete<Result<null>>(`/api/business/orders/${guid}`);
}

export const cardAcquisitionCostQueryOptions = (
  orgId: string | undefined,
  scanId: string | undefined,
) =>
  queryOptions({
    queryKey: businessKeys.cardCost(orgId, scanId),
    queryFn: () =>
      apiGet<Result<CardAcquisitionCost>>(
        `/api/business/cost/cards/${scanId}`,
      ).then((result) => (result.success ? (result.data ?? null) : null)),
    enabled: !!orgId && !!scanId,
  });

export function setCardAcquisitionCost(
  scanId: string,
  input: CardAcquisitionCostInput,
) {
  return apiPut<Result<CardAcquisitionCost>>(
    `/api/business/cost/cards/${scanId}`,
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

export const priceLabelCardsQueryOptions = (
  orgId: string | undefined,
  source: PriceLabelSource | null,
  sourceGuid: string | null,
) =>
  queryOptions({
    queryKey: businessKeys.priceLabelCards(orgId, source, sourceGuid),
    queryFn: () =>
      apiGet<Result<PriceLabelCardsResponse>>(
        `/api/business/price-labels/cards?${new URLSearchParams({
          source: source ?? "",
          guid: sourceGuid ?? "",
        })}`,
      ).then(unwrap),
    enabled: !!orgId && !!source && !!sourceGuid,
  });

export const unmovedBuysQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: businessKeys.unmovedBuys(orgId),
    queryFn: () =>
      apiGet<Result<UnmovedBuy[]>>("/api/business/intake/unmoved").then(
        (result) => result.data ?? [],
      ),
    enabled: !!orgId,
  });

export const buyPerformanceQueryOptions = (guid: string | undefined, enabled: boolean) =>
  queryOptions({
    queryKey: businessKeys.buyPerformance(guid),
    queryFn: () =>
      apiGet<Result<BuyPerformance>>(`/api/business/intake/${guid}/performance`).then(unwrap),
    enabled: !!guid && enabled,
  });

function salesReportParams(filters: SalesReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.from) params.set(SALES_REPORT_FROM_PARAM, filters.from);
  if (filters.to) params.set(SALES_REPORT_TO_PARAM, filters.to);
  if (filters.buyGuid) params.set(SALES_REPORT_BUY_PARAM, filters.buyGuid);
  return params;
}

export const salesReportQueryOptions = (
  orgId: string | undefined,
  filters: SalesReportFilters,
  page: number,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: businessKeys.sales(orgId, filters, page),
    queryFn: async () => {
      const params = salesReportParams(filters);
      params.set("page", String(page));
      const result = await apiGet<Result<SalesReport>>(
        `/api/business/sales?${params.toString()}`,
      );
      if (!result.success) throw new Error(result.message);
      return result.data ?? null;
    },
    enabled: !!orgId && enabled,
    placeholderData: keepPreviousData,
  });

export async function downloadPosExportCsv(request: PosExportRequest): Promise<Blob> {
  const blob = await apiPostBlob("/api/business/price-labels/pos-export", request);
  if (blob.type.includes("json")) {
    const result = JSON.parse(await blob.text()) as Result<unknown>;
    throw new Error(result.message);
  }
  return blob;
}

export function downloadSalesReportCsv(filters: SalesReportFilters): Promise<Blob> {
  return apiGetBlob(`/api/business/sales/export?${salesReportParams(filters).toString()}`);
}

export const inventoryMarginQueryOptions = (orgId: string | undefined, enabled: boolean) =>
  queryOptions({
    queryKey: businessKeys.inventoryMargin(orgId),
    queryFn: () =>
      apiGet<Result<InventoryMargin>>("/api/business/inventory/margin").then(unwrap),
    enabled: !!orgId && enabled,
  });
