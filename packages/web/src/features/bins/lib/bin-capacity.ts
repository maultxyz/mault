export interface BinCapacityRow {
  sizeKey: "capacityInfoSmall" | "capacityInfoMedium" | "capacityInfoLarge";
  thin: number;
  thick: number;
}

export const BIN_CAPACITY_TABLE: BinCapacityRow[] = [
  { sizeKey: "capacityInfoSmall", thin: 230, thick: 170 },
  { sizeKey: "capacityInfoMedium", thin: 380, thick: 281 },
  { sizeKey: "capacityInfoLarge", thin: 626, thick: 463 },
];
