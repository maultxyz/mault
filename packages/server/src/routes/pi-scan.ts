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
  updatePiScanSettings,
} from "../lib/pi-scan/session";
import { requireAuth, requireOrg, type AppEnv } from "../middleware/auth";

export { PI_SCAN_SESSION_PATH };

export const piScanRouter = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, (c) => {
    return c.json({ success: true, data: getPiScanSession(c.get("orgId")) });
  })
  .post("/", requireAuth, requireOrg, async (c) => {
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
  .post("/pause", requireAuth, requireOrg, (c) => {
    const state = pausePiScanSession(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/resume", requireAuth, requireOrg, (c) => {
    const state = resumePiScanSession(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is paused." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/settings", requireAuth, requireOrg, async (c) => {
    const body = await c.req.json<PiScanSessionSettingsBody>();
    const state = updatePiScanSettings(
      c.get("orgId"),
      body.foilType,
      body.preferredSetCode,
      body.autoFeed,
    );
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .post("/feed", requireAuth, requireOrg, (c) => {
    const state = requestPiScanFeed(c.get("orgId"));
    if (!state) {
      return c.json({ success: false, message: "No scan is running." }, 409);
    }
    return c.json({ success: true, data: state });
  })
  .delete("/", requireAuth, requireOrg, (c) => {
    return c.json({ success: true, data: stopPiScanSession(c.get("orgId")) });
  });
