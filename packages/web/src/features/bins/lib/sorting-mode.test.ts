import { describe, expect, it } from "vitest";
import {
  sortingModeChangePatch,
  sortingModeOfDraft,
} from "@/features/bins/lib/sorting-mode";
import type { BinModeDraft } from "@/lib/interfaces/bins";
import { SORTING_MODE_OPTIONS } from "@/lib/constants/bins";
import { SCAN_RULE_GAME_FIELD } from "@magic-vault/shared";

const rulesDraft: BinModeDraft = {
  autoAssignField: null,
  scanOnly: false,
  scanOnlyMatchedBin: null,
  scanOnlyUnmatchedBin: null,
  isRepackMode: false,
  isAlphabetMode: false,
  isChaosMode: false,
  chaosBinSize: null,
  skipSaving: false,
  isResortMode: false,
  matchGameKeys: [],
};

describe("sortingModeOfDraft", () => {
  it("reads the plain rules mode when no mode flag is set", () => {
    expect(sortingModeOfDraft(rulesDraft)).toBe("rules");
  });

  it("tells sort by game apart from field auto-detect", () => {
    expect(
      sortingModeOfDraft({
        ...rulesDraft,
        autoAssignField: SCAN_RULE_GAME_FIELD,
      }),
    ).toBe("game-sort");
    expect(
      sortingModeOfDraft({ ...rulesDraft, autoAssignField: "rarity" }),
    ).toBe("auto-assign");
  });
});

describe("sortingModeChangePatch", () => {
  it("stages nothing when the mode stays the same", () => {
    expect(sortingModeChangePatch("chaos", "chaos", "rarity")).toEqual({});
  });

  it("round-trips every mode through the draft", () => {
    for (const currentMode of SORTING_MODE_OPTIONS) {
      const current = {
        ...rulesDraft,
        ...sortingModeChangePatch("rules", currentMode, "rarity"),
      };
      expect(sortingModeOfDraft(current)).toBe(currentMode);
      for (const nextMode of SORTING_MODE_OPTIONS) {
        const next = {
          ...current,
          ...sortingModeChangePatch(currentMode, nextMode, "rarity"),
        };
        expect(sortingModeOfDraft(next)).toBe(nextMode);
      }
    }
  });

  it("stages what the sort by game switch staged", () => {
    expect(sortingModeChangePatch("rules", "game-sort", "rarity")).toEqual({
      autoAssignField: SCAN_RULE_GAME_FIELD,
      skipSaving: true,
      isResortMode: false,
    });
    expect(sortingModeChangePatch("game-sort", "rules", "rarity")).toEqual({
      autoAssignField: null,
      matchGameKeys: [],
    });
  });

  it("starts auto-detect on the first eligible field", () => {
    expect(sortingModeChangePatch("scan-only", "auto-assign", "set")).toEqual({
      scanOnly: false,
      autoAssignField: "set",
    });
  });
});
