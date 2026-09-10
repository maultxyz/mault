import type { PhoneCameraMessage } from "@magic-vault/shared";
import { Hono } from "hono";
import { emitToSession } from "../../lib/session-stream";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

// POST /collections/:guid/phone-camera-signal — relays presence/capture
// messages between a desktop scanner session and a phone paired as its
// camera. Both sides are already subscribed to this collection's /stream
// SSE; this just fans a message out to them. No WebRTC - the "photo"
// case carries the actual captured image as a data URL, same as how
// scanned cards already store capturedImageDataUrl.
export const phoneCameraSignalRoute = new Hono<AppEnv>().post(
  "/:guid/phone-camera-signal",
  requireAuth,
  requireOrg,
  async (c) => {
    const guid = c.req.param("guid");
    const message = await c.req.json<PhoneCameraMessage>();
    emitToSession(guid, "phone_camera_message", message);
    return c.json({ success: true, data: null });
  },
);
