import {
  PHONE_CAMERA_CAPTURE_FORM_FIELD,
  PHONE_CAMERA_CAPTURE_MAX_BYTES,
  type PhoneCameraMessage,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  announcePhoneCameraCapture,
  holdPhoneCameraCapture,
  isValidPhoneCameraRequestId,
  relayPhoneCameraMessage,
  takePhoneCameraCapture,
} from "../../lib/phone-camera-captures";
import {
  markRequestAsReadOnly,
  rejectWhileImpersonating,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

const captureUploadLimit = bodyLimit({
  maxSize: PHONE_CAMERA_CAPTURE_MAX_BYTES,
  onError: (c) => c.json({ success: false, message: "Payload too large." }, 413),
});

export const phoneCameraSignalRoute = new Hono<AppEnv>()
  .post(
    "/:guid/phone-camera-signal",
    requireAuth,
    requireOrg,
    markRequestAsReadOnly,
    rejectWhileImpersonating,
    async (c) => {
      const message = await c.req.json<PhoneCameraMessage>();
      relayPhoneCameraMessage(c.get("orgId"), c.req.param("guid"), message);
      return c.json({ success: true, data: null });
    },
  )
  .post(
    "/:guid/phone-camera/captures/:requestId",
    requireAuth,
    requireOrg,
    markRequestAsReadOnly,
    rejectWhileImpersonating,
    captureUploadLimit,
    async (c) => {
      const requestId = c.req.param("requestId");
      if (!isValidPhoneCameraRequestId(requestId)) {
        return c.json({ success: false, message: "Invalid capture request." }, 400);
      }
      const body = await c.req.parseBody();
      const image = body[PHONE_CAMERA_CAPTURE_FORM_FIELD];
      if (!(image instanceof File) || image.size === 0) {
        return c.json({ success: false, message: "Missing image." }, 400);
      }
      const orgId = c.get("orgId");
      const collectionGuid = c.req.param("guid");
      holdPhoneCameraCapture(orgId, collectionGuid, requestId, {
        bytes: Buffer.from(await image.arrayBuffer()),
        contentType: image.type || "image/jpeg",
      });
      announcePhoneCameraCapture(orgId, collectionGuid, requestId);
      return c.json({ success: true, data: null });
    },
  )
  .get(
    "/:guid/phone-camera/captures/:requestId",
    requireAuth,
    requireOrg,
    rejectWhileImpersonating,
    (c) => {
      const capture = takePhoneCameraCapture(
        c.get("orgId"),
        c.req.param("guid"),
        c.req.param("requestId"),
      );
      if (!capture) {
        return c.json({ success: false, message: "Capture not found." }, 404);
      }
      return c.body(new Uint8Array(capture.bytes), 200, {
        "Content-Type": capture.contentType,
        "Cache-Control": "no-store",
      });
    },
  );
