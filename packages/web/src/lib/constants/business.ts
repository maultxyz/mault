import type {
  BusinessBadgeVariant,
  BusinessStatus,
  SetPricesTab,
} from "@/lib/interfaces/business";
import type { PickImportFormValues } from "@/schemas/business.schema";
import {
  IconBookmark,
  IconCash,
  IconPackageExport,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { CARD_RESERVATION_REQUEST_PARAM } from "@/lib/constants/card-reservations";
import {
  CARD_RESERVATIONS_WEB_PATH,
  ORDER_BATCH_PICK_PATH,
  ORDER_PICK_SEARCH_PARAM,
  ORDER_PICKS_PATH,
  type CardCostFormValues,
  type SellPriceFormValues,
  type CsvImportField,
} from "@magic-vault/shared";

export const ORDERS_PATH = "/app/orders";
export const INTAKE_PATH = `${ORDERS_PATH}/intake`;
export const PICKS_PATH = ORDER_PICKS_PATH;
export const PICK_IMPORT_PATH = `${PICKS_PATH}/new`;
export const PRICE_LABELS_PATH = `${ORDERS_PATH}/labels`;
export const RESERVATIONS_PATH = CARD_RESERVATIONS_WEB_PATH;
export const reservationRequestsPath = (requestGuids: readonly string[]) =>
  requestGuids.length === 1
    ? `${RESERVATIONS_PATH}?${CARD_RESERVATION_REQUEST_PARAM}=${requestGuids[0]}`
    : RESERVATIONS_PATH;
export const PICK_BATCH_PATH = ORDER_BATCH_PICK_PATH;
export const PACKING_SLIPS_PATH = `${PICKS_PATH}/packing-slips`;
export const LEGACY_INTAKE_PATH = "/app/intake";
export const LEGACY_PICKS_VIEW_PARAM = "view";
export const LEGACY_PICKS_VIEW = "picks";
export const LEGACY_REPORTS_PATH = "/app/reports";

export const intakeReceiptPath = (guid: string, autoPrint = false) =>
  `${INTAKE_PATH}/${guid}/receipt${autoPrint ? `?${RECEIPT_PRINT_PARAM}=1` : ""}`;

export const BUSINESS_INTAKE_VIEW = "intake";
export const BUSINESS_PICKS_VIEW = "picks";
export const BUSINESS_RESERVATIONS_VIEW = "reservations";
export const BUSINESS_LABELS_VIEW = "labels";
export const BUSINESS_VIEW_PATHS = {
  [BUSINESS_INTAKE_VIEW]: INTAKE_PATH,
  [BUSINESS_PICKS_VIEW]: PICKS_PATH,
  [BUSINESS_RESERVATIONS_VIEW]: RESERVATIONS_PATH,
  [BUSINESS_LABELS_VIEW]: PRICE_LABELS_PATH,
} as const;
const ordersQuery = (orderGuids: string[]) =>
  new URLSearchParams(orderGuids.map((orderGuid) => [ORDER_PARAM, orderGuid])).toString();
export const pickBatchPath = (orderGuids: string[]) =>
  `${PICK_BATCH_PATH}?${ordersQuery(orderGuids)}`;
export const packingSlipsPath = (orderGuids: string[]) =>
  `${PACKING_SLIPS_PATH}?${ordersQuery(orderGuids)}`;
export const picksPath = (orderGuid?: string | null) =>
  `${PICKS_PATH}${orderGuid ? `?${ORDER_PARAM}=${orderGuid}` : ""}`;

export const INTAKE_LOT_PARAM = "lot";
export const BUSINESS_STATUS_FILTER_ALL = "all";
export const BUSINESS_OVERVIEW_VIEW_PARAM = "view";
export const BUSINESS_OVERVIEW_RANGE_PARAM = "range";
export const BUSINESS_OVERVIEW_COLLECTION_PARAM = "collection";
export const BUSINESS_OVERVIEW_CHECK_PARAM = "check";
export const BUSINESS_OVERVIEW_MAIN_VIEW = "overview";
export const BUSINESS_OVERVIEW_VIEWS = [BUSINESS_OVERVIEW_MAIN_VIEW, "staff", "accuracy"] as const;
export const BUSINESS_SALES_METRICS = ["count", "revenue"] as const;
export const BUSINESS_RESERVATION_STAGE_COLORS = {
  readyForPickup: "var(--success)",
  beingPicked: "var(--info)",
  toPull: "var(--warning)",
  waiting: "var(--muted-foreground)",
} as const;
export const BUSINESS_ATTENTION_ICONS = {
  readyForPickup: IconBookmark,
  readyToComplete: IconPackageExport,
  toPull: IconTruckDelivery,
  openIntake: IconCash,
} as const;
export const BUSINESS_SECTION_PATHS = {
  intake: INTAKE_PATH,
  picks: PICKS_PATH,
  reservations: RESERVATIONS_PATH,
} as const;
export const BUSINESS_INVENTORY_COLUMNS = [
  "name",
  "cardCount",
  "totalValue",
  "costBasis",
  "margin",
] as const;
export const intakeLotPath = (lotGuid: string) => `${INTAKE_PATH}?${INTAKE_LOT_PARAM}=${lotGuid}`;
export const BUSINESS_SECTION_VIEWS = [
  BUSINESS_INTAKE_VIEW,
  BUSINESS_PICKS_VIEW,
  BUSINESS_RESERVATIONS_VIEW,
  BUSINESS_LABELS_VIEW,
] as const;
export const ORDER_PARAM = ORDER_PICK_SEARCH_PARAM;

export const INTAKE_LIVE_REFETCH_MS = 4000;
export const INTAKE_BANNER_REFETCH_MS = 10000;
export const INTAKE_LOT_CARDS_PAGE_SIZE = 50;
export const FLEET_REFETCH_MS = 15_000;
export const BUSINESS_LIST_SKELETON_COUNT = 5;
export const BUSINESS_LIST_SEARCH_DEBOUNCE_MS = 300;
export const ACTIVITY_ALL_FILTER = "all";

export const ORDER_PULL_SHEET_HEADERS = [
  "Location",
  "Position",
  "Collection",
  "Bin",
  "Card",
  "Set",
  "Number",
  "Condition",
  "Foil",
  "Order",
  "Order bin",
] as const;

export const PICK_IMPORT_STEPS = ["source", "columns", "review"] as const;
export const PICK_IMPORT_CREATE_MODES = ["together", "separate"] as const;
export const PICK_IMPORT_COMPOSITIONS = [
  "reference",
  "master-detail",
  "single",
] as const;
export const PICK_IMPORT_FIELDS = [
  "name",
  "quantity",
  "orderRef",
  "setCode",
  "setName",
  "collectorNumber",
  "condition",
  "foil",
  "language",
  "unitPrice",
] as const satisfies readonly CsvImportField[];
export const PICK_IMPORT_NO_COLUMN = "none";
export const PICK_IMPORT_DEFAULT_VALUES: PickImportFormValues = {
  text: "",
  createMode: "together",
  pickName: "",
  orderNames: [],
};

export const SERVICE_INTERVAL_PRESETS = [2000, 5000, 10000] as const;
export const COST_MODES = ["spread", "each"] as const;

export const STATUS_BADGE_VARIANTS: Record<
  BusinessStatus,
  BusinessBadgeVariant
> = {
  open: "info",
  accepted: "success",
  fulfilled: "success",
  completed: "success",
  cancelled: "secondary",
};
export const INTAKE_CARD_PARAM = "card";
export const INTAKE_REVIEW_PARAM = "review";
export const RECEIPT_PRINT_PARAM = "print";

export const SET_PRICES_TABS = ["sell", "cost"] as const;
export const SELL_PRICE_ONLY_TABS: readonly SetPricesTab[] = ["sell"];
export const SELL_PRICE_EXAMPLE_MARKET_PRICE = 10;
export const SELL_PRICE_PREVIEW_MARKET_PRICES = [0.5, 3.37, 10, 48.2] as const;
export const SELL_PRICE_FORM_DEFAULT_VALUES: SellPriceFormValues = {
  mode: "default",
  markupPercent: 20,
  fixedPrice: 0,
};
export const CARD_COST_FORM_DEFAULT_VALUES: CardCostFormValues = {
  mode: "each",
  amount: 0,
};
