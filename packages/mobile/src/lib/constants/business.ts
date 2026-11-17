import type { FulfilmentOrderStatus, IntakeLotFormValues, IntakeLotStatus } from "@magic-vault/shared";
import type { PillProps } from "@/lib/interfaces/ui";

export const BUSINESS_QUERY_KEY = ["business"] as const;
export const BUSINESS_ORDERS_QUERY_KEY = [...BUSINESS_QUERY_KEY, "orders"] as const;
export const BUSINESS_INTAKE_QUERY_KEY = [...BUSINESS_QUERY_KEY, "intake"] as const;
export const BUSINESS_LIST_PAGE_SIZE = 30;
export const INTAKE_LOT_CARDS_PAGE_SIZE = 50;
export const INTAKE_LIVE_REFETCH_MS = 4000;
export const BUSINESS_INTAKE_VIEW = "intake";
export const BUSINESS_PICKS_VIEW = "picks";
export const BUSINESS_VIEWS = [BUSINESS_INTAKE_VIEW, BUSINESS_PICKS_VIEW] as const;
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
