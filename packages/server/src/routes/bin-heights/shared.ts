import type { BinHeight } from "@magic-vault/shared";

export function toBinHeight(row: BinHeight): BinHeight {
  return {
    binNumber: row.binNumber,
    height: row.height,
  };
}
