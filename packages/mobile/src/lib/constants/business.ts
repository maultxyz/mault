import type {
  BuySourceType,
  BuyStartFormValues,
  CardReservationStage,
  FulfilmentOrderStatus,
  IntakeLotStatus,
} from "@magic-vault/shared";
import type { BusinessTip } from "@/lib/interfaces/business";
import type { IconName, PillProps } from "@/lib/interfaces/ui";

export const BUSINESS_QUERY_KEY = ["business"] as const;
export const BUSINESS_ORDERS_QUERY_KEY = [...BUSINESS_QUERY_KEY, "orders"] as const;
export const BUSINESS_INTAKE_QUERY_KEY = [...BUSINESS_QUERY_KEY, "intake"] as const;
export const BUSINESS_CARD_PRICING_QUERY_KEY = [...BUSINESS_QUERY_KEY, "card-pricing"] as const;
export const BUSINESS_LIST_PAGE_SIZE = 30;
export const INTAKE_LOT_CARDS_PAGE_SIZE = 50;
export const INTAKE_LIVE_REFETCH_MS = 4000;
export const BUSINESS_OVERVIEW_VIEW = "overview";
export const BUSINESS_INTAKE_VIEW = "intake";
export const BUSINESS_PICKS_VIEW = "picks";
export const BUSINESS_RESERVATIONS_VIEW = "reservations";
export const BUSINESS_SALES_VIEW = "sales";
export const BUSINESS_CATALOGS_VIEW = "catalogs";
export const BUSINESS_VIEWS = [
  BUSINESS_OVERVIEW_VIEW,
  BUSINESS_INTAKE_VIEW,
  BUSINESS_PICKS_VIEW,
  BUSINESS_RESERVATIONS_VIEW,
  BUSINESS_SALES_VIEW,
  BUSINESS_CATALOGS_VIEW,
] as const;
export const BUSINESS_SALES_QUERY_KEY = [...BUSINESS_QUERY_KEY, "sales"] as const;
export const BUSINESS_INVENTORY_MARGIN_QUERY_KEY = [...BUSINESS_QUERY_KEY, "inventory-margin"] as const;
export const SALES_RANGES = ["7", "30", "90", "all"] as const;
export const SALES_RANGE_DAYS: Record<(typeof SALES_RANGES)[number], number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};
export const SALES_DEFAULT_RANGE: (typeof SALES_RANGES)[number] = "30";
export const BUSINESS_OVERVIEW_QUERY_KEY = [...BUSINESS_QUERY_KEY, "overview"] as const;
export const BUSINESS_ATTENTION_ICONS = {
  readyForPickup: "bookmark",
  readyToComplete: "checkAll",
  toPull: "upload",
  openIntake: "coins",
} as const;
export const BUSINESS_RESERVATIONS_QUERY_KEY = [...BUSINESS_QUERY_KEY, "reservations"] as const;
export const CARD_RESERVATION_ACTION_COLLECT = "collect";
export const CARD_RESERVATION_ACTION_RELEASE = "release";
export const CARD_RESERVATION_OPTION_SEPARATOR = ":";
export const CARD_RESERVATION_REQUEST_OPTION_TARGET = "request";
export const CARD_RESERVATION_ACTION_PICK = "pick";
export const CARD_RESERVATION_ACTION_OPEN_PICK = "openPick";
export const CARD_RESERVATION_STAGE_TONES: Record<CardReservationStage, NonNullable<PillProps["tone"]>> = {
  readyForPickup: "success",
  beingPicked: "info",
  toPull: "warning",
  waiting: "neutral",
  collected: "success",
  cancelled: "neutral",
  released: "neutral",
  expired: "neutral",
  unavailable: "destructive",
};
export const PICK_WALK_ORDERS_SEPARATOR = ",";
export const PICK_WALK_NEXT_CARD_WIDTH = 104;
export const BUY_START_DEFAULT_VALUES: BuyStartFormValues = {
  sourceType: "customer",
  name: "",
  contact: "",
  notes: "",
  collectionGuid: "",
  storageLocationGuid: "",
};
export const BUY_NO_STORAGE_LOCATION_OPTION = "none";
export const BUY_SOURCE_ICONS: Record<BuySourceType, IconName> = {
  customer: "account",
  vendor: "store",
  opened: "sparkles",
};
export const ORDER_DECKLIST_DEFAULT_VALUES = { name: "", decklist: "" };
export const BUSINESS_STATUS_TONES: Record<IntakeLotStatus | FulfilmentOrderStatus, NonNullable<PillProps["tone"]>> = {
  open: "info",
  accepted: "success",
  fulfilled: "success",
  cancelled: "neutral",
};
export const BUSINESS_LIST_SKELETON_ROWS = 5;
export const BUSINESS_LIST_SEARCH_DEBOUNCE_MS = 300;
export const SELL_PRICE_PREVIEW_MARKET_PRICE = 10;

export const BUSINESS_TIPS_TOPICS = ["overview", "buys", "picks", "reservations", "sales", "catalogs", "scanBuy"] as const;

export const BUSINESS_TIPS: Record<(typeof BUSINESS_TIPS_TOPICS)[number], BusinessTip[]> = {
  overview: [
    { key: "what", icon: "store" },
    { key: "rightNow", icon: "live" },
    { key: "attention", icon: "warning" },
    { key: "sales", icon: "stats" },
    { key: "sections", icon: "menu" },
  ],
  buys: [
    { key: "start", icon: "plus" },
    { key: "offer", icon: "coins" },
    { key: "adjust", icon: "edit" },
    { key: "finish", icon: "check" },
    { key: "performance", icon: "trophy" },
    { key: "moveIntoStock", icon: "storage" },
  ],
  picks: [
    { key: "create", icon: "plus" },
    { key: "together", icon: "group" },
    { key: "walk", icon: "storage" },
    { key: "phone", icon: "qrCode" },
    { key: "complete", icon: "checkAll" },
  ],
  reservations: [
    { key: "lists", icon: "menu" },
    { key: "stages", icon: "clock" },
    { key: "pull", icon: "checkAll" },
    { key: "pickedUp", icon: "check" },
    { key: "release", icon: "close" },
  ],
  sales: [
    { key: "filters", icon: "filter" },
    { key: "totals", icon: "coins" },
    { key: "profit", icon: "stats" },
    { key: "list", icon: "menu" },
  ],
  catalogs: [
    { key: "create", icon: "store" },
    { key: "share", icon: "qrCode" },
    { key: "manage", icon: "edit" },
  ],
  scanBuy: [
    { key: "start", icon: "plus" },
    { key: "scan", icon: "camera" },
    { key: "line", icon: "coins" },
    { key: "finish", icon: "check" },
  ],
};

export const BUSINESS_TIPS_TOPIC_BY_VIEW: Record<(typeof BUSINESS_VIEWS)[number], (typeof BUSINESS_TIPS_TOPICS)[number]> = {
  [BUSINESS_OVERVIEW_VIEW]: "overview",
  [BUSINESS_INTAKE_VIEW]: "buys",
  [BUSINESS_PICKS_VIEW]: "picks",
  [BUSINESS_RESERVATIONS_VIEW]: "reservations",
  [BUSINESS_SALES_VIEW]: "sales",
  [BUSINESS_CATALOGS_VIEW]: "catalogs",
};
export const BUSINESS_OVERVIEW_SKELETON_NOW_TILE_COUNT = 4;
export const BUSINESS_OVERVIEW_SKELETON_SALES_TILE_COUNT = 2;
export const BUSINESS_OVERVIEW_SKELETON_HIGHLIGHT_COUNT = 2;
