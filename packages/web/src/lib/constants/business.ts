import type {
  BusinessBadgeVariant,
  BusinessStatus,
} from "@/lib/interfaces/business";
import type { PickImportFormValues } from "@/schemas/business.schema";
import {
  ORDER_BATCH_PICK_PATH,
  ORDER_PICK_SEARCH_PARAM,
  ORDER_PICKS_PATH,
  type CsvImportField,
} from "@magic-vault/shared";

export const ORDERS_PATH = "/app/orders";
export const INTAKE_PATH = `${ORDERS_PATH}/intake`;
export const PICKS_PATH = ORDER_PICKS_PATH;
export const PICK_IMPORT_PATH = `${PICKS_PATH}/new`;
export const PRICE_LABELS_PATH = `${ORDERS_PATH}/labels`;
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
export const BUSINESS_LABELS_VIEW = "labels";
export const BUSINESS_VIEWS = [
  BUSINESS_INTAKE_VIEW,
  BUSINESS_PICKS_VIEW,
  BUSINESS_LABELS_VIEW,
] as const;
export const MOBILE_BUSINESS_VIEWS = [
  BUSINESS_INTAKE_VIEW,
  BUSINESS_PICKS_VIEW,
] as const;
export const BUSINESS_VIEW_PATHS = {
  [BUSINESS_INTAKE_VIEW]: INTAKE_PATH,
  [BUSINESS_PICKS_VIEW]: PICKS_PATH,
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
export const ORDER_PARAM = ORDER_PICK_SEARCH_PARAM;

export const INTAKE_LIVE_REFETCH_MS = 4000;
export const INTAKE_BANNER_REFETCH_MS = 10000;
export const INTAKE_LOT_CARDS_PAGE_SIZE = 50;
export const FLEET_REFETCH_MS = 15_000;
export const BUSINESS_LIST_SKELETON_COUNT = 5;
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

export const ORDER_DETAIL_VIEWS = ["location", "order"] as const;

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
export const BUYLIST_PREVIEW_PRICES = [0.25, 2, 10, 50] as const;
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
