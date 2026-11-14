import {
  ROUTE_RESPONSE_TIMEOUT_MS,
  ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS,
  SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
} from "./constants/serial-timing.constant";
import type { BinRoute } from "./interfaces/bin-routes.interface";
import type {
  RouteOptions,
  SorterRouteRequest,
} from "./interfaces/serial-session.interface";

export async function requestSorterRoute(
  request: SorterRouteRequest,
  route: BinRoute,
  options: RouteOptions = {},
  timeoutMs = options.feedNext
    ? ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS
    : ROUTE_RESPONSE_TIMEOUT_MS,
  sensorTimeoutMs = SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
) {
  if (options.requireLoadedCard) {
    const sensors = await request({ readIR: true }, sensorTimeoutMs);
    if (
      !Array.isArray(sensors?.ir) ||
      sensors.ir[0] !== true ||
      sensors.error
    ) {
      return { noLoadedCard: true } as const;
    }
  }
  return request(
    {
      route: {
        module: route.module,
        direction: route.direction,
        ...(options.feedNext ? { feedNext: true } : {}),
      },
    },
    timeoutMs,
  );
}
