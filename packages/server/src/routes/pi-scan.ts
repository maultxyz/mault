import {
  PI_SCAN_SESSION_PATH,
  type PiScanBottomsBody,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { setPiBottomLevers } from "../lib/pi-scan/bottoms";
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
    const result = await startPiScanSession({
      orgId: c.get("orgId"),
      userId: c.get("userId"),
      jwtClaims: c.get("jwtClaims"),
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
  .post("/bottoms", requireAuth, requireOrg, async (c) => {
    const body = await c.req.json<PiScanBottomsBody>();
    if (body.position !== "open" && body.position !== "closed") {
      return c.json(
        { success: false, message: "Position must be open or closed." },
        400,
      );
    }
    const result = await setPiBottomLevers({
      orgId: c.get("orgId"),
      jwtClaims: c.get("jwtClaims"),
      position: body.position,
    });
    if (!result.ok) {
      return c.json({ success: false, message: result.message }, result.status);
    }
    return c.json({ success: true });
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
