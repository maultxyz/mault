import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { UNLIMITED_BIN_HEIGHT } from "@magic-vault/shared";
import { useComputedBinFillLevels } from "./use-computed-bin-fill-levels";

const mocks = vi.hoisted(() => ({
  configs: [
    {
      guid: "bin-1",
      binNumber: 1,
      rules: { combinator: "and", conditions: [] },
      claimedStorageLocation: {
        guid: "location",
        name: "A1",
        capacity: 50,
        remainingSlots: 5,
      },
    },
    {
      guid: "bin-2",
      binNumber: 2,
      rules: { combinator: "and", conditions: [] },
      claimedStorageLocation: null,
    },
  ],
}));

vi.mock("@/features/bins/api/use-bin-configs", () => ({
  useBinConfigs: () => ({ configs: mocks.configs, selectedSet: null }),
}));
vi.mock("@/features/calibration/api/use-bin-heights", () => ({
  useBinHeights: () => ({
    savedHeights: [
      { binNumber: 1, height: UNLIMITED_BIN_HEIGHT },
      { binNumber: 2, height: UNLIMITED_BIN_HEIGHT },
    ],
  }),
}));
vi.mock("@/features/collections/api/use-collection-cards", () => ({
  useBinCardCounts: () => ({
    counts: new Map([
      [1, 5],
      [2, 5],
    ]),
    storageBatchStarts: new Map(),
    updatedAt: 0,
  }),
}));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({ activeCollection: null }),
}));

it("limits a bin to the room left in the storage location it fills", () => {
  const { result } = renderHook(() => useComputedBinFillLevels());
  const [claimed, unclaimed] = result.current.levels;
  expect(claimed).toMatchObject({ binNumber: 1, count: 5, capacity: 5, percent: 100 });
  expect(unclaimed).toMatchObject({ binNumber: 2, count: 5, capacity: null });
});
