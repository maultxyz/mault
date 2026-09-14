import {
  createDefaultBinRoutes,
  type BinDirection,
  type BinRoute,
} from "@magic-vault/shared";

export type RouteRow = {
  binNumber: number;
  module: number;
  direction: string;
};

export function toBinRoute(row: RouteRow): BinRoute {
  return {
    binNumber: row.binNumber,
    module: row.module,
    direction: row.direction as BinDirection,
  };
}

export function buildRoutes(moduleCount: number, rows: RouteRow[]): BinRoute[] {
  const defaults = createDefaultBinRoutes(moduleCount);
  return defaults.map((def) => {
    const row = rows.find((r) => r.binNumber === def.binNumber);
    return row ? toBinRoute(row) : def;
  });
}
