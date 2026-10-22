export type BinDirection = "left" | "right" | "bottom";

export interface BinRoute {
  binNumber: number;
  module: number;
  direction: BinDirection;
}

export function computeBinCount(moduleCount: number): number {
  return moduleCount * 2 + 1;
}

export function routeForBin(binNumber: number, routes: BinRoute[]): BinRoute {
  const found = routes.find((route) => route.binNumber === binNumber);
  if (found) return found;
  const lastModule = Math.max(1, ...routes.map((route) => route.module));
  return { binNumber, module: lastModule, direction: "bottom" };
}

export function createDefaultBinRoutes(moduleCount: number): BinRoute[] {
  const routes: BinRoute[] = [];
  for (let module = 1; module <= moduleCount; module++) {
    routes.push({ binNumber: (module - 1) * 2 + 1, module, direction: "left" });
    routes.push({ binNumber: (module - 1) * 2 + 2, module, direction: "right" });
  }
  routes.push({ binNumber: computeBinCount(moduleCount), module: moduleCount, direction: "bottom" });
  return routes;
}
