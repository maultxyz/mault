import type { BinHeight } from "@magic-vault/shared";

export type HeightRow = {
  binNumber: number;
  height: number;
};

export function toBinHeight(row: HeightRow): BinHeight {
  return {
    binNumber: row.binNumber,
    height: row.height,
  };
}
