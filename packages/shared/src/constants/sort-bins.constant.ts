import type {
  BinHeightPreset,
  BinRuleGroup,
  DefaultBinInit,
  FieldType,
} from "../interfaces/sort-bins.interface";

export const SET_NAME_MAX_LENGTH = 50;
export const CONDITION_STRING_MAX_LENGTH = 200;
export const CONDITION_NUMERIC_MAX = 100_000;
export const DEFAULT_BIN_CAPACITY = 250;
export const OVERRIDE_PRIORITY_MAX = 100;
export const LOW_MATCH_PERCENT_MAX = 100;

export const UNLIMITED_BIN_HEIGHT = 0;

export const BIN_HEIGHT_PRESETS: BinHeightPreset[] = [
  { key: "small", height: 60 },
  { key: "medium", height: 113 },
  { key: "large", height: 187 },
  { key: "unlimited", height: UNLIMITED_BIN_HEIGHT },
];

export const DEFAULT_BIN_HEIGHT = BIN_HEIGHT_PRESETS[0].height;

export const CUSTOM_BIN_SIZE_KEY = "custom";
export const CUSTOM_BIN_HEIGHT_MIN_MM = 1;
export const CUSTOM_BIN_HEIGHT_MAX_MM = 1000;

export const DEFAULT_CARD_THICKNESS_MM = 0.3;
export const ALPHABET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ALPHABET_PREFIX_MAX_LENGTH = 10;

export const SORTABLE_FIELD_TYPES: FieldType[] = ["string", "numeric", "enum"];

export function createDefaultCatchAllOnlyBins(
  binCount: number,
): DefaultBinInit[] {
  return Array.from({ length: binCount }, (_, i) => ({
    binNumber: i + 1,
    isCatchAll: i === binCount - 1,
    cardLimit: DEFAULT_BIN_CAPACITY,
    rules: {
      id: crypto.randomUUID(),
      combinator: "and" as const,
      conditions: [],
    } satisfies BinRuleGroup,
  }));
}
