import {
  PI_SCAN_SESSION_PATH,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
} from "@magic-vault/shared";
import { Hono } from "hono";
import {
  getPiScanSession,
  pausePiScanSession,
  resumePiScanSession,
  startPiScanSession,
  stopPiScanSession,
  requestPiScanFeed,
  resetPiScanSessionStats,
  updatePiScanSettings,
} from "../lib/pi-scan/session";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../middleware/auth";
import { piUpdateRunning } from "../lib/pi-update";

export { PI_SCAN_SESSION_PATH };

import { isPiHost } from "../lib/pi-host";

export const piScanRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => (isPiHost() ? next() : c.notFound()))
  .get("/", requireAuth, requireOrg, (c) => {
    return c.json({ success: true, data: getPiScanSession(c.get("orgId")) });
  })
  .post("/", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    if (await piUpdateRunning())
      return c.json(
        { success: false, message: "A system update is running." },
        409,
      );
    const body = await c.req.json<PiScanSessionStartBody>();
    const header = c.req.header("Authorization") ?? "";
    const result = await startPiScanSession({
      orgId: c.get("orgId"),
      userId: c.get("userId"),
      jwtClaims: c.get("jwtClaims"),
      accessToken: header.startsWith("Bearer ") ? header.slice(7) : "",
      body,
    });
    if (!result.ok) {
      return c.json(
        { success: false, message: result.message, code: result.code },
        result.status,
      );
    }
    return c.json({ success: true, data: result.state });
  })
  .post("/pause", requireAuth, requireOrg, rejectWhileImpersonating, (c) => {
    const state = pausePiScanSession(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/resume", requireAuth, requireOrg, rejectWhileImpersonating, (c) => {
    const state = resumePiScanSession(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is paused." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/settings", requireAuth, requireOrg, rejectWhileImpersonating, async (c) => {
    const body = await c.req.json<PiScanSessionSettingsBody>();
    const state = updatePiScanSettings(
      c.get("orgId"),
      body.foilType,
      body.preferredSetCodes,
      body.autoFeed,
    );
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/feed", requireAuth, requireOrg, rejectWhileImpersonating, (c) => {
    const state = requestPiScanFeed(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/reset-stats", requireAuth, requireOrg, rejectWhileImpersonating, (c) => {
    const state = resetPiScanSessionStats(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan session to reset." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .delete("/", requireAuth, requireOrg, rejectWhileImpersonating, (c) => {
    return c.json({ success: true, data: stopPiScanSession(c.get("orgId")) });
  });
