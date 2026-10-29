import type { PhoneCameraMessage } from "@magic-vault/shared";
import { Hono } from "hono";
import { emitToSession } from "../../lib/session-stream";
import {
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

export const phoneCameraSignalRoute = new Hono<AppEnv>().post(
  "/:guid/phone-camera-signal",
  requireAuth,
  requireOrg,
  rejectWhileImpersonating,
  async (c) => {
    const guid = c.req.param("guid");
    const message = await c.req.json<PhoneCameraMessage>();
    emitToSession(guid, "phone_camera_message", message);
    return c.json({ success: true, data: null });
  },
);
