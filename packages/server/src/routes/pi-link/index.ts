import type { NodeWebSocket } from "@hono/node-ws";
import {
  PI_LINK_COMMANDS_SEGMENT,
  PI_LINK_DEVICE_PATH,
  type PiLinkDeviceIdentity,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import {
  PI_LINK_DEVICE_API_SEGMENT,
  PI_LINK_SCAN_ACTOR_HEADER,
} from "../../lib/constants/scan-host";
import type { PiLinkEnv } from "../../lib/interfaces/pi-hosts";
import { findPiHostByToken, issuePiSorterBridgeCredential, notePiHostSeen } from "../../lib/pi-hosts";
import {
  PI_LINK_RATE_LIMIT_SWEEP_SIZE,
  PI_LINK_RATE_LIMITED_MESSAGE,
  PI_SORTER_BRIDGE_OTHER_SORTER_MESSAGE,
  PI_SORTER_BRIDGE_PATH,
  PI_SORTER_BRIDGE_RATE_LIMIT_REQUESTS,
  PI_SORTER_BRIDGE_RATE_LIMIT_WINDOW_MS,
  PI_SORTER_HARDWARE_ID_PATTERN,
} from "../../lib/constants/pi-hosts";
import { createRateLimiter } from "../../lib/public-api/rate-limit";
import {
  attachPiLinkDevice,
  detachPiLinkDevice,
  receivePiLinkDeviceMessage,
} from "../../lib/pi-link-relay";
import { isPiLinkAllowedRoute, requestAsScanActor } from "../../lib/scan-actor-routes";

const consumeSorterBridgeRateLimit = createRateLimiter({
  requests: PI_SORTER_BRIDGE_RATE_LIMIT_REQUESTS,
  windowMs: PI_SORTER_BRIDGE_RATE_LIMIT_WINDOW_MS,
  sweepSize: PI_LINK_RATE_LIMIT_SWEEP_SIZE,
});

const DEVICE_API_PREFIX = `${PI_LINK_DEVICE_PATH}${PI_LINK_DEVICE_API_SEGMENT}`;

export const requirePiHostToken = createMiddleware<PiLinkEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return c.json({ success: false, message: "Unauthorized" }, 401);
  const host = await findPiHostByToken(header.slice(7).trim());
  if (!host) return c.json({ success: false, message: "Unauthorized" }, 401);
  c.set("piHost", host);
  notePiHostSeen(host).catch((error: unknown) =>
    console.error("[pi-link] could not record when the Pi was last seen:", error),
  );
  await next();
});

export function createPiLinkDeviceRouter(upgradeWebSocket: NodeWebSocket["upgradeWebSocket"]) {
  return new Hono<PiLinkEnv>()
    .get(
      PI_LINK_COMMANDS_SEGMENT,
      requirePiHostToken,
      upgradeWebSocket((c) => {
        const host = c.get("piHost");
        return {
          onOpen: (_event, socket) => attachPiLinkDevice(host, socket),
          onMessage: (event, socket) => receivePiLinkDeviceMessage(host, socket, event.data),
          onClose: (_event, socket) => detachPiLinkDevice(host.hostGuid, socket),
        };
      }),
    )
    .post(PI_SORTER_BRIDGE_PATH, requirePiHostToken, async (c) => {
      const body = (await c.req.json().catch(() => null)) as { hardwareId?: unknown } | null;
      const hardwareId = typeof body?.hardwareId === "string" ? body.hardwareId.trim().toUpperCase() : "";
      if (!PI_SORTER_HARDWARE_ID_PATTERN.test(hardwareId))
        return c.json({ success: false, message: "Invalid sorter id." }, 400);
      const host = c.get("piHost");
      const rate = consumeSorterBridgeRateLimit(host.hostGuid);
      if (!rate.allowed) return c.json({ success: false, message: PI_LINK_RATE_LIMITED_MESSAGE }, 429);
      const data = await issuePiSorterBridgeCredential(host, hardwareId);
      if (!data) return c.json({ success: false, message: PI_SORTER_BRIDGE_OTHER_SORTER_MESSAGE }, 409);
      return c.json({ success: true, data });
    })
    .get("/me", requirePiHostToken, (c) => {
      const host = c.get("piHost");
      const data: PiLinkDeviceIdentity = { hostGuid: host.hostGuid, orgId: host.orgId, name: host.name };
      return c.json({ success: true, data });
    })
    .all(`${PI_LINK_DEVICE_API_SEGMENT}/*`, requirePiHostToken, async (c) => {
      const host = c.get("piHost");
      const url = new URL(c.req.url);
      const prefixAt = url.pathname.indexOf(DEVICE_API_PREFIX);
      const path = prefixAt >= 0 ? url.pathname.slice(prefixAt + DEVICE_API_PREFIX.length) : "";
      const method = c.req.method;
      if (!isPiLinkAllowedRoute(method, path))
        return c.json({ success: false, message: "Not found." }, 404);
      const actingUserId = c.req.header(PI_LINK_SCAN_ACTOR_HEADER)?.trim();
      if (!host.activeScanUserId || actingUserId !== host.activeScanUserId)
        return c.json({ success: false, message: "No scan was started for this Pi by that member." }, 403);
      const response = await requestAsScanActor({
        actor: { userId: host.activeScanUserId, orgId: host.orgId },
        method,
        path: `${path}${url.search}`,
        headers: { "Content-Type": c.req.header("Content-Type") ?? "application/json" },
        body: method === "GET" ? undefined : await c.req.arrayBuffer(),
        signal: c.req.raw.signal,
      });
      return response ?? c.json({ success: false, message: "Not found." }, 404);
    });
}
