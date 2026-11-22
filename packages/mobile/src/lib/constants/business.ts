import type {
  CardReservationStage,
  FulfilmentOrderStatus,
  IntakeLotFormValues,
  IntakeLotStatus,
} from "@magic-vault/shared";
import type { PillProps } from "@/lib/interfaces/ui";

export const BUSINESS_QUERY_KEY = ["business"] as const;
export const BUSINESS_ORDERS_QUERY_KEY = [...BUSINESS_QUERY_KEY, "orders"] as const;
export const BUSINESS_INTAKE_QUERY_KEY = [...BUSINESS_QUERY_KEY, "intake"] as const;
export const BUSINESS_LIST_PAGE_SIZE = 30;
export const INTAKE_LOT_CARDS_PAGE_SIZE = 50;
export const INTAKE_LIVE_REFETCH_MS = 4000;
export const BUSINESS_INTAKE_VIEW = "intake";
export const BUSINESS_PICKS_VIEW = "picks";
export const BUSINESS_RESERVATIONS_VIEW = "reservations";
export const BUSINESS_VIEWS = [BUSINESS_INTAKE_VIEW, BUSINESS_PICKS_VIEW, BUSINESS_RESERVATIONS_VIEW] as const;
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
export const INTAKE_LOT_DEFAULT_VALUES: IntakeLotFormValues = {
  collectionMode: "new",
  collectionGuid: "",
  gameGuid: "",
  lang: "",
  customerName: "",
  customerContact: "",
  notes: "",
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
