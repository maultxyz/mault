import type {
  BinCondition,
  BinRuleGroup,
} from "../interfaces/sort-bins.interface";

export const SET_NAME_MAX_LENGTH = 50;
export const CONDITION_STRING_MAX_LENGTH = 200;
export const CONDITION_NUMERIC_MAX = 100_000;

export type DefaultBinInit = {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll: boolean;
};

const COLOR_BINS: Array<{ binNumber: number; colors: string[] }> = [
  { binNumber: 1, colors: ["W"] },
  { binNumber: 2, colors: ["U"] },
  { binNumber: 3, colors: ["B"] },
  { binNumber: 4, colors: ["R"] },
  { binNumber: 5, colors: ["G"] },
  { binNumber: 6, colors: [] },
];

export function createDefaultColorBins(binCount: number): DefaultBinInit[] {
  if (binCount !== 7) return createDefaultCatchAllOnlyBins(binCount);

  return [
    ...COLOR_BINS.map(({ binNumber, colors }) => ({
      binNumber,
      isCatchAll: false,
      rules: {
        id: crypto.randomUUID(),
        combinator: "and" as const,
        conditions: [
          {
            id: crypto.randomUUID(),
            field: "color_identity",
            operator: "equals",
            value: colors,
          } satisfies BinCondition,
        ],
      } satisfies BinRuleGroup,
    })),
    {
      binNumber: 7,
      isCatchAll: true,
      rules: {
        id: crypto.randomUUID(),
        combinator: "and" as const,
        conditions: [],
      } satisfies BinRuleGroup,
    },
  ];
}

export function createDefaultCatchAllOnlyBins(
  binCount: number,
): DefaultBinInit[] {
  return Array.from({ length: binCount }, (_, i) => ({
    binNumber: i + 1,
    isCatchAll: i === binCount - 1,
    rules: {
      id: crypto.randomUUID(),
      combinator: "and" as const,
      conditions: [],
    } satisfies BinRuleGroup,
  }));
}
