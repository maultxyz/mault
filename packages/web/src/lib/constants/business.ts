import type {
  BusinessBadgeVariant,
  BusinessStatus,
} from "@/lib/interfaces/business";
import type { OrderPicksFormValues } from "@/schemas/business.schema";

export const INTAKE_PATH = "/app/intake";
export const LEGACY_ORDERS_PATH = "/app/orders";
export const LEGACY_REPORTS_PATH = "/app/reports";

export const intakeReceiptPath = (guid: string, autoPrint = false) =>
  `${INTAKE_PATH}/${guid}/receipt${autoPrint ? `?${RECEIPT_PRINT_PARAM}=1` : ""}`;

export const INTAKE_LOT_PARAM = "lot";
export const ORDER_PARAM = "order";
export const REPORT_CHECK_PARAM = "check";
export const REPORT_COLLECTION_PARAM = "collection";
export const REPORT_RANGE_PARAM = "range";

export const INTAKE_LIVE_REFETCH_MS = 4000;
export const FLEET_REFETCH_MS = 15_000;
export const BUSINESS_LIST_SKELETON_COUNT = 5;
export const ACTIVITY_ALL_FILTER = "all";

export const ORDER_IMPORT_ACCEPT = ".csv,.tsv,.txt,text/csv,text/plain";
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
] as const;

export const SERVICE_INTERVAL_PRESETS = [2000, 5000, 10000] as const;
export const BUYLIST_PREVIEW_PRICES = [0.25, 2, 10, 50] as const;
export const COST_MODES = ["spread", "each"] as const;

export const STATUS_BADGE_VARIANTS: Record<
  BusinessStatus,
  BusinessBadgeVariant
> = {
  open: "outline",
  accepted: "success",
  fulfilled: "success",
  completed: "success",
  cancelled: "secondary",
};
export const EMPTY_PICKS: OrderPicksFormValues = { picked: [] };
export const NEW_COLLECTION_OPTION = "__new__";
export const INTAKE_CARD_PARAM = "card";
export const INTAKE_REVIEW_PARAM = "review";
export const RECEIPT_PRINT_PARAM = "print";
