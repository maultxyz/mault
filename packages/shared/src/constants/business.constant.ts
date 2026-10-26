import type {
  ActivityAction,
  BuylistConfig,
  BusinessPermissions,
  IntakeCollectionMode,
  IntakePayoutMethod,
  OrderSource,
} from "../interfaces/business.interface";

export const DEFAULT_BUYLIST_CONFIG: BuylistConfig = {
  minCardValue: 0,
  tiers: [
    { minPrice: 20, percent: 70 },
    { minPrice: 5, percent: 60 },
    { minPrice: 0, percent: 50 },
  ],
  bulkThreshold: 0.5,
  bulkOffer: 0.01,
  creditBonusPercent: 25,
};

export const BUYLIST_TIERS_MAX = 10;
export const BUYLIST_PRICE_MAX = 1_000_000;
export const BUYLIST_PERCENT_MAX = 100;
export const BUYLIST_CREDIT_BONUS_MAX = 200;

export const BUSINESS_PERMISSION_KEYS = [
  "viewCosts",
  "acceptIntake",
  "fulfilOrders",
  "viewActivity",
] as const;

export const DEFAULT_BUSINESS_PERMISSIONS: BusinessPermissions = {
  viewCosts: false,
  acceptIntake: false,
  fulfilOrders: true,
  viewActivity: false,
};

export const INTAKE_PAYOUT_METHODS: readonly IntakePayoutMethod[] = [
  "cash",
  "credit",
];
export const INTAKE_COLLECTION_MODES: readonly IntakeCollectionMode[] = [
  "new",
  "existing",
];
export const INTAKE_COLLECTION_NAME_PREFIX = "Intake:";
export const INTAKE_COLLECTION_NAME_SUFFIX_ROOM = 5;
export const INTAKE_LANG_MAX_LENGTH = 10;
export const INTAKE_TEXT_MAX_LENGTH = 120;
export const INTAKE_NOTES_MAX_LENGTH = 1000;
export const INTAKE_LOTS_LIST_LIMIT = 200;

export const ORDER_SOURCES: readonly OrderSource[] = [
  "tcgplayer",
  "shopify",
  "generic",
];
export const ORDER_NAME_MAX_LENGTH = 120;
export const ORDER_LINES_MAX = 2000;
export const ORDER_LINE_QUANTITY_MAX = 999;
export const ORDER_LINE_TEXT_MAX_LENGTH = 200;

export const ORDER_IMPORT_HEADER_ALIASES = {
  name: ["product name", "card name", "name", "title", "card", "product"],
  setCode: ["set code", "edition code", "set id"],
  setName: ["set", "set name", "edition", "expansion"],
  collectorNumber: [
    "number",
    "collector number",
    "card number",
    "collector #",
    "card #",
  ],
  condition: ["condition"],
  foil: ["foil", "printing", "finish"],
  quantity: ["quantity", "qty", "count", "order quantity"],
  unitPrice: ["price", "unit price", "price each", "sold price", "sale price"],
  orderRef: ["order #", "order number", "order", "order id"],
} as const;

export const SHOPIFY_ORDER_HEADERS = {
  orderRef: "name",
  name: "lineitem name",
  quantity: "lineitem quantity",
  unitPrice: "lineitem price",
} as const;

export const TCGPLAYER_DETECT_HEADERS: readonly string[] = [
  "product line",
  "skuid",
  "sku id",
  "tcgplayer id",
];

export const ORDER_CONDITION_PATTERNS: readonly {
  pattern: RegExp;
  condition: "NM" | "LP" | "MP" | "HP" | "DMG";
}[] = [
  { pattern: /\b(near mint|nm|mint)\b/i, condition: "NM" },
  { pattern: /\b(lightly played|light played|excellent|lp|ex)\b/i, condition: "LP" },
  { pattern: /\b(heavily played|hp|poor)\b/i, condition: "HP" },
  { pattern: /\b(damaged|dmg)\b/i, condition: "DMG" },
  { pattern: /\b(moderately played|played|mp|good)\b/i, condition: "MP" },
];

export const ORDER_FOIL_PATTERN = /\bfoil\b/i;
export const ORDER_NON_FOIL_PATTERN = /\b(non[- ]?foil|normal|nonfoil)\b/i;

export const ACTIVITY_ACTIONS = [
  "card.corrected",
  "card.deleted",
  "cards.deleted",
  "cards.cleared",
  "cards.condition",
  "collection.deleted",
  "cost.set",
  "intake.created",
  "intake.accepted",
  "intake.cancelled",
  "intake.transferred",
  "order.created",
  "order.fulfilled",
  "order.cancelled",
  "accuracy.completed",
  "device.serviced",
  "business.settings",
] as const;

export const ACTIVITY_PAGE_SIZE = 50;
export const ACTIVITY_PAGE_SIZE_MAX = 200;

export const DEVICE_ALERT_TYPES = [
  "jam",
  "error",
  "timeout",
  "restart",
  "feeder_empty",
  "offline",
  "maintenance",
] as const;
export const DEVICE_RECENT_ALERTS_LIMIT = 5;
export const DEVICE_ALERTS_LIST_LIMIT = 50;
export const DEVICE_MAINTENANCE_INTERVAL_MIN = 100;
export const DEVICE_MAINTENANCE_INTERVAL_MAX = 10_000_000;
export const DEVICE_MAINTENANCE_DUE_RATIO = 0.9;

export const ACCURACY_SAMPLE_SIZES = [20, 50, 100] as const;
export const ACCURACY_DEFAULT_SAMPLE_SIZE = 50;
export const ACCURACY_CHECKS_LIST_LIMIT = 50;
export const ACCURACY_CONFIDENCE_Z = 1.96;

export const INVENTORY_HISTORY_DAYS = 90;

export const ACTIVITY_ACTION_KEYS: Record<ActivityAction, string> = {
  "card.corrected": "cardCorrected",
  "card.deleted": "cardDeleted",
  "cards.deleted": "cardsDeleted",
  "cards.cleared": "cardsCleared",
  "cards.condition": "cardsCondition",
  "collection.deleted": "collectionDeleted",
  "cost.set": "costSet",
  "intake.created": "intakeCreated",
  "intake.accepted": "intakeAccepted",
  "intake.cancelled": "intakeCancelled",
  "intake.transferred": "intakeTransferred",
  "order.created": "orderCreated",
  "order.fulfilled": "orderFulfilled",
  "order.cancelled": "orderCancelled",
  "accuracy.completed": "accuracyCompleted",
  "device.serviced": "deviceServiced",
  "business.settings": "businessSettings",
};
export const PAGED_LIST_DEFAULT_SIZE = 20;
export const PAGED_LIST_MAX_SIZE = 100;
