import type {
  DemoIntakeRow,
  DemoRuleCondition,
  DemoRuleField,
  DemoRuleFieldName,
  DemoStorageLocation,
} from "@/lib/interfaces/landing";

export const GAMES_MARQUEE_MIN_ITEMS = 12;

export const GAMES_MARQUEE_SECONDS_PER_ITEM = 4;

export const DEMO_BIN_DIAGRAM_MODULES = [
  { module: 1, left: 1, right: 2 },
  { module: 2, left: 3, right: 4 },
  { module: 3, left: 5, right: 6 },
];

export const HERO_SORT_INTERVAL_MS = 2600;

export const HERO_QUEUE_PREVIEW = 3;

export const HERO_ARRIVAL_DELAY_MS = 1700;

export const HERO_BIN_CAPACITY = 150;

export const HERO_LOG_ENTRY_COUNT = 5;

export const HERO_MATCH_COUNT_UP_MS = 900;

export const HERO_READOUT_TYPING_MS_PER_CHARACTER = 35;

export const HERO_READOUT_ROW_DELAY_MS = 700;

export const HERO_READOUT_ROW_STAGGER_MS = 140;

export const HERO_BIN_BASE_COUNTS: Record<number, number> = {
  1: 41,
  2: 57,
  3: 23,
  4: 66,
  5: 18,
  6: 4,
  7: 12,
};

export const MARKETING_FOOTER_LINK_CLASS =
  "transition-colors hover:text-foreground";

export const DEMO_STORAGE_LOCATIONS: DemoStorageLocation[] = [
  {
    guid: "demo-box-1",
    name: "Box 1",
    cardCount: 248,
    totalValue: 1284.5,
    storedCards: [
      { cardIndex: 1 },
      { cardIndex: 5 },
      { cardIndex: 4 },
      { cardIndex: 2 },
    ],
  },
  {
    guid: "demo-box-2",
    name: "Box 2",
    cardCount: 812,
    totalValue: 96.4,
    storedCards: [{ cardIndex: 0 }, { cardIndex: 3 }, { cardIndex: 2 }],
  },
  {
    guid: "demo-trade-box",
    name: "Trade box",
    cardCount: 96,
    totalValue: 412.75,
    storedCards: [{ cardIndex: 5, isFoil: true }, { cardIndex: 0 }],
  },
];

export const DEMO_STORAGE_SEARCH = "Ragavan";

export const DEMO_STORAGE_TYPING_DELAY_MS = 1600;

export const FEATURE_GROUP_ITEM_REVEAL_STAGGER_MS = 70;

export const FEATURE_REVEAL_HIDDEN_CLASS = "opacity-0 motion-reduce:opacity-100";

export const FEATURE_SPOTLIGHT_REVEAL_ROOT_MARGIN = "0px 0px -20% 0px";

export const FEATURE_GROUPS_REVEAL_ROOT_MARGIN = "0px 0px -10% 0px";

export const DEMO_COUNT_UP_DURATION_MS = 1400;

export const DEMO_TYPEWRITER_MS_PER_CHARACTER = 110;

export const DEMO_REVEAL_STAGGER_MS = 140;

export const DEMO_RULE_MATCH_BIN = 1;

export const DEMO_RULE_MAX_CONDITIONS = 3;

export const DEMO_RULE_OPERATORS = ["is", "is not"] as const;

export const DEMO_COLOR_NAMES_BY_LETTER: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

export const DEMO_RULE_FIELDS: Record<DemoRuleFieldName, DemoRuleField> = {
  Rarity: {
    values: ["Common", "Uncommon", "Rare", "Mythic"],
    readCardValues: (card) => [card.rarity],
  },
  Color: {
    values: ["White", "Blue", "Black", "Red", "Green", "Colorless"],
    readCardValues: (card) =>
      card.colorIdentity.length
        ? card.colorIdentity.map((letter) => DEMO_COLOR_NAMES_BY_LETTER[letter])
        : ["Colorless"],
  },
  Type: {
    values: ["Instant", "Creature", "Artifact", "Legendary"],
    readCardValues: (card) => card.typeLine.split(/\s+/),
  },
};

export const DEMO_RULE_INITIAL_CONDITIONS: DemoRuleCondition[] = [
  { field: "Rarity", operator: "is", value: "Mythic" },
  { field: "Color", operator: "is", value: "Red" },
];

export const DEMO_RULE_ADDED_CONDITION: DemoRuleCondition = {
  field: "Type",
  operator: "is",
  value: "Instant",
};

export const DEMO_COLLECTION_VALUE_HISTORY = [
  1412, 1398, 1430, 1455, 1441, 1470, 1502, 1488, 1515, 1540, 1531, 1562,
  1590, 1574, 1601, 1633, 1620, 1648, 1662, 1655, 1690, 1712, 1704, 1731,
  1748, 1770, 1762, 1781, 1779, 1793.65,
];

export const DEMO_COLLECTION_RARITY_VALUES = [
  { rarity: "mythic", value: 912.4 },
  { rarity: "rare", value: 604.15 },
  { rarity: "uncommon", value: 188.6 },
  { rarity: "common", value: 88.5 },
];

export const DEMO_CHART_WIDTH = 320;

export const DEMO_CHART_HEIGHT = 96;

export const DEMO_INTAKE_CUSTOMER = "Ann";

export const DEMO_INTAKE_CREDIT_BONUS = 25;

export const DEMO_INTAKE_ROWS: DemoIntakeRow[] = [
  { cardIndex: 5, market: 42.16, offer: 29.51 },
  { cardIndex: 1, market: 1.85, offer: 0.93 },
  { cardIndex: 0, market: 1.12, offer: 0.56 },
  { cardIndex: 3, market: 0.14, offer: 0, declined: true },
];

