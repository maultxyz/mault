import type { PiLinkScanAction } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { authQuery } from "../../db";
import {
  PI_HOST_NOT_FOUND_MESSAGE,
  PI_HOST_START_IN_PROGRESS_MESSAGE,
  PI_LINK_OFFLINE_MESSAGE,
  PI_LINK_SCAN_RUNNING_MESSAGE,
} from "../../lib/constants/pi-hosts";
import { UUID_PATTERN } from "../../lib/constants/validation";
import { findPiHostActiveScanUser, setPiHostActiveScanUser } from "../../lib/pi-hosts";
import {
  beginPiHostScanStart,
  endPiHostScanStart,
  piHostScanStatus,
  sendPiLinkCommand,
} from "../../lib/pi-link-relay";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

function findHost(c: Context<AppEnv>) {
  const guid = c.req.param("guid") ?? "";
  if (!UUID_PATTERN.test(guid)) return Promise.resolve(null);
  const orgId = c.get("orgId");
  return authQuery(c.get("jwtClaims"), (tx) => findPiHostActiveScanUser(tx, orgId, guid)).then(
    (host) => (host ? { guid, ...host } : null),
  );
}

async function relayPiScanAction(c: Context<AppEnv>, action: PiLinkScanAction, body?: unknown) {
  const host = await findHost(c);
  if (!host) return c.json({ success: false, message: PI_HOST_NOT_FOUND_MESSAGE }, 404);
  const result = await sendPiLinkCommand(host.guid, c.get("userId"), action, body);
  return c.json(result.body, result.status as ContentfulStatusCode);
}

const readBody = (c: Context<AppEnv>) => c.req.json<unknown>();

export const piHostScanSessionRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const host = await findHost(c);
    if (!host) return c.json({ success: false, message: PI_HOST_NOT_FOUND_MESSAGE }, 404);
    return c.json({ success: true, data: piHostScanStatus(host.guid) });
  })
  .post("/", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    const host = await findHost(c);
    if (!host) return c.json({ success: false, message: PI_HOST_NOT_FOUND_MESSAGE }, 404);
    const status = piHostScanStatus(host.guid);
    if (!status.connected)
      return c.json({ success: false, message: PI_LINK_OFFLINE_MESSAGE, code: "offline" }, 503);
    const current = status.state;
    if (current && (current.phase === "running" || current.phase === "paused" || current.stopping))
      return c.json({ success: false, message: PI_LINK_SCAN_RUNNING_MESSAGE, code: "running" }, 409);
    const orgId = c.get("orgId");
    const userId = c.get("userId");
    const body = await readBody(c);
    if (!beginPiHostScanStart(host.guid))
      return c.json({ success: false, message: PI_HOST_START_IN_PROGRESS_MESSAGE, code: "busy" }, 409);
    try {
      const previousUserId = (await findHost(c))?.activeScanUserId ?? null;
      await setPiHostActiveScanUser(host.guid, orgId, userId);
      const result = await sendPiLinkCommand(host.guid, userId, "start", body);
      if (!result.body.success) await setPiHostActiveScanUser(host.guid, orgId, previousUserId);
      return c.json(result.body, result.status as ContentfulStatusCode);
    } finally {
      endPiHostScanStart(host.guid);
    }
  })
  .post("/pause", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "pause"),
  )
  .post("/resume", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "resume"),
  )
  .post("/emergency-stop", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "emergencyStop"),
  )
  .post("/feed", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "feed"),
  )
  .post("/reset-stats", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "resetStats"),
  )
  .post("/settings", requireAuth, requireOrg, rejectWhileImpersonating, async (c) =>
    relayPiScanAction(c, "settings", await readBody(c)),
  )
  .post("/removal", requireAuth, requireOrg, rejectWhileImpersonating, async (c) =>
    relayPiScanAction(c, "removal", await readBody(c)),
  )
  .delete("/", requireAuth, requireOrg, rejectWhileImpersonating, (c) =>
    relayPiScanAction(c, "stop"),
  );
