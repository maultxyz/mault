import { BIN_SLOTS_PHYSICAL_ORDER } from "@/lib/constants/calibration";
import type { BinLevelLayout } from "@/lib/interfaces/scanner";
import type { BinRoute } from "@magic-vault/shared";

export function buildBinLevelLayout(
  routes: BinRoute[],
  binNumbers: number[],
): BinLevelLayout {
  const known = new Set(binNumbers);
  const modules = Array.from(
    new Set(
      routes.filter((r) => r.direction !== "bottom").map((r) => r.module),
    ),
  ).sort((a, b) => a - b);
  const rows = modules
    .map((module) =>
      BIN_SLOTS_PHYSICAL_ORDER.map(({ direction }) => {
        const bin = routes.find(
          (r) => r.module === module && r.direction === direction,
        )?.binNumber;
        return bin != null && known.has(bin) ? bin : undefined;
      }),
    )
    .filter((row) => row.some((bin) => bin != null));
  const bottom = routes
    .filter((r) => r.direction === "bottom" && known.has(r.binNumber))
    .map((r) => r.binNumber);
  const placed = new Set([...rows.flat(), ...bottom]);
  const unplaced = binNumbers.filter((bin) => !placed.has(bin));
  for (let i = 0; i < unplaced.length; i += 2) {
    rows.push([unplaced[i], unplaced[i + 1]]);
  }
  return { rows, bottom };
}
