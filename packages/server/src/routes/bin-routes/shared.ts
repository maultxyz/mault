import {
  createDefaultBinRoutes,
  type BinDirection,
  type BinRoute,
} from "@magic-vault/shared";
import type { BinRouteRow } from "../../lib/interfaces/calibration";

export function toBinRoute(row: BinRouteRow): BinRoute {
  return {
    binNumber: row.binNumber,
    module: row.module,
    direction: row.direction as BinDirection,
  };
}

export function buildRoutes(moduleCount: number, rows: BinRouteRow[]): BinRoute[] {
  const defaults = createDefaultBinRoutes(moduleCount);
  return defaults.map((def) => {
    const row = rows.find((r) => r.binNumber === def.binNumber);
    return row ? toBinRoute(row) : def;
  });
}
