import type { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { sortBinsRouter } from "../routes/bins";
import { collectionsRouter } from "../routes/collections";
import { scanHostRouter } from "../routes/scan-host";
import { SERVER_SCAN_ACTOR } from "./constants/scan-actor";
import {
  PI_LINK_ALLOWED_ROUTES,
  SCAN_HOST_BINS_PATH,
  SCAN_HOST_COLLECTIONS_PATH,
  SCAN_HOST_PATH,
} from "./constants/scan-host";
import type { ScanActorRouteRequest } from "./interfaces/pi-scan-api";

const SCAN_ACTOR_ROUTERS: [string, Hono<AppEnv>][] = [
  [SCAN_HOST_COLLECTIONS_PATH, collectionsRouter],
  [SCAN_HOST_BINS_PATH, sortBinsRouter],
  [SCAN_HOST_PATH, scanHostRouter],
];

function pathnameOf(path: string): string {
  return path.split("?")[0];
}

export function isPiLinkAllowedRoute(method: string, path: string): boolean {
  const pathname = pathnameOf(path);
  return PI_LINK_ALLOWED_ROUTES.some(
    (route) => route.method === method && route.pattern.test(pathname),
  );
}

export async function requestAsScanActor({
  actor,
  method,
  path,
  headers = {},
  body,
  signal,
}: ScanActorRouteRequest): Promise<Response | null> {
  const pathname = pathnameOf(path);
  const match = SCAN_ACTOR_ROUTERS.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!match) return null;
  const [prefix, router] = match;
  return router.request(
    path.slice(prefix.length) || "/",
    {
      method,
      headers: { ...headers, "X-Org-Id": actor.orgId },
      body: method === "GET" ? undefined : body,
      signal,
    },
    { [SERVER_SCAN_ACTOR]: actor },
  );
}
