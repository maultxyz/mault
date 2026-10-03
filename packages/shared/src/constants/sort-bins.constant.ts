import type { BinRuleGroup } from "../interfaces/sort-bins.interface";

export const SET_NAME_MAX_LENGTH = 50;
export const CONDITION_STRING_MAX_LENGTH = 200;
export const CONDITION_NUMERIC_MAX = 100_000;
export const DEFAULT_BIN_CAPACITY = 250;
export const ALPHABET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ALPHABET_PREFIX_MAX_LENGTH = 10;

export type DefaultBinInit = {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll: boolean;
  isOverride?: boolean;
  cardLimit: number | null;
  maxCopies?: number | null;
  isDisabled?: boolean;
};

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
