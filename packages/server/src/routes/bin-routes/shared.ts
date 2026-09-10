import {
  createDefaultBinRoutes,
  DEFAULT_MODULE_COUNT,
  type BinDirection,
  type BinRoute,
} from "@magic-vault/shared";
import type { Transaction } from "../../db";

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

async function getModuleCount(tx: Transaction, orgId: string): Promise<number> {
  const row = await tx.query.orgSettings.findFirst({
    where: (t, { eq }) => eq(t.orgId, orgId),
    columns: { moduleCount: true },
  });
  return row?.moduleCount ?? DEFAULT_MODULE_COUNT;
}

export async function buildRoutes(
  tx: Transaction,
  orgId: string,
  rows: RouteRow[],
): Promise<BinRoute[]> {
  const moduleCount = await getModuleCount(tx, orgId);
  const defaults = createDefaultBinRoutes(moduleCount);
  return defaults.map((def) => {
    const row = rows.find((r) => r.binNumber === def.binNumber);
    return row ? toBinRoute(row) : def;
  });
}
