import type { BinRoute } from "@magic-vault/shared";
import { PI_SCAN_ROUTE_TIMEOUT_MS, PI_SCAN_STATUS_TIMEOUT_MS } from "../constants/pi-scan";
import type { SorterLink } from "./sorter-link";

export async function routeLoadedPiCard(link: SorterLink, route: BinRoute): Promise<void> {
  const sensors = await link.command({ readIR: true }, PI_SCAN_STATUS_TIMEOUT_MS);
  if (sensors.error || !Array.isArray(sensors.ir) || sensors.ir[0] !== true) {
    throw new Error(
      "No card detected at module 1.",
    );
  }
  const reply = await link.command(
    { route: { module: route.module, direction: route.direction } },
    PI_SCAN_ROUTE_TIMEOUT_MS,
  );
  if (reply.error || reply.skipped === true || reply.status !== "routed") {
    throw new Error(
      typeof reply.error === "string"
        ? reply.error
        : "The sorter did not confirm routing.",
    );
  }
}
