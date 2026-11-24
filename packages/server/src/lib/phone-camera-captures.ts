import type { PhoneCameraMessage } from "@magic-vault/shared";
import {
  PHONE_CAMERA_CAPTURES_MAX_HELD,
  PHONE_CAMERA_CAPTURE_TTL_MS,
  PHONE_CAMERA_DATA_URL_PATTERN,
  PHONE_CAMERA_REQUEST_ID_PATTERN,
} from "./constants/phone-camera";
import type { PhoneCameraCapture } from "./interfaces/phone-camera";
import { emitToSession } from "./session-stream";
import { createTtlCache } from "./ttl-cache";

const heldCaptures = createTtlCache<PhoneCameraCapture>({
  name: "phone-camera.captures",
  ttlMs: PHONE_CAMERA_CAPTURE_TTL_MS,
  maxEntries: PHONE_CAMERA_CAPTURES_MAX_HELD,
});

function captureKey(orgId: string, collectionGuid: string, requestId: string): string {
  return `${orgId}:${collectionGuid}:${requestId}`;
}

export function isValidPhoneCameraRequestId(requestId: string | undefined): requestId is string {
  return !!requestId && PHONE_CAMERA_REQUEST_ID_PATTERN.test(requestId);
}

export function holdPhoneCameraCapture(
  orgId: string,
  collectionGuid: string,
  requestId: string,
  capture: PhoneCameraCapture,
): void {
  heldCaptures.set(captureKey(orgId, collectionGuid, requestId), capture);
}

export function takePhoneCameraCapture(
  orgId: string,
  collectionGuid: string,
  requestId: string,
): PhoneCameraCapture | undefined {
  const key = captureKey(orgId, collectionGuid, requestId);
  const capture = heldCaptures.get(key);
  if (capture) heldCaptures.deleteWhere((candidate) => candidate === key);
  return capture;
}

export function phoneCameraCaptureFromDataUrl(dataUrl: string): PhoneCameraCapture | null {
  const match = PHONE_CAMERA_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return bytes.length > 0 ? { bytes, contentType: match[1] } : null;
}

export function announcePhoneCameraCapture(orgId: string, collectionGuid: string, requestId: string): void {
  const message: PhoneCameraMessage = {
    kind: "capture_response",
    requestId,
    imageIsStoredOnServer: true,
  };
  emitToSession(orgId, collectionGuid, "phone_camera_message", message);
}

export function relayPhoneCameraMessage(orgId: string, collectionGuid: string, message: PhoneCameraMessage): void {
  if (message.kind === "capture_response" && message.imageDataUrl) {
    const capture = phoneCameraCaptureFromDataUrl(message.imageDataUrl);
    if (!capture || !isValidPhoneCameraRequestId(message.requestId)) return;
    holdPhoneCameraCapture(orgId, collectionGuid, message.requestId, capture);
    announcePhoneCameraCapture(orgId, collectionGuid, message.requestId);
    return;
  }
  emitToSession(orgId, collectionGuid, "phone_camera_message", message);
}
