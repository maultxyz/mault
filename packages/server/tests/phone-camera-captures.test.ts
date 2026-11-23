import assert from "node:assert/strict";
import { test } from "node:test";
import {
  holdPhoneCameraCapture,
  phoneCameraCaptureFromDataUrl,
  relayPhoneCameraMessage,
  takePhoneCameraCapture,
} from "../src/lib/phone-camera-captures";
import { subscribeSession } from "../src/lib/session-stream";

const collectionGuid = "1b6f0c1e-5a39-4e0f-8f8d-2b7f7e6a9c41";

test("a held capture is handed out once and only to its own org and collection", () => {
  holdPhoneCameraCapture("org-a", collectionGuid, "request-1", {
    bytes: Buffer.from([1, 2, 3]),
    contentType: "image/jpeg",
  });
  assert.equal(takePhoneCameraCapture("org-b", collectionGuid, "request-1"), undefined);
  assert.equal(takePhoneCameraCapture("org-a", "other-collection", "request-1"), undefined);
  assert.deepEqual(takePhoneCameraCapture("org-a", collectionGuid, "request-1")?.bytes, Buffer.from([1, 2, 3]));
  assert.equal(takePhoneCameraCapture("org-a", collectionGuid, "request-1"), undefined);
});

test("data URLs from store app versions decode into image bytes", () => {
  const capture = phoneCameraCaptureFromDataUrl(`data:image/jpeg;base64,${Buffer.from("jpeg").toString("base64")}`);
  assert.equal(capture?.contentType, "image/jpeg");
  assert.equal(capture?.bytes.toString(), "jpeg");
  assert.equal(phoneCameraCaptureFromDataUrl("not a data url"), null);
});

test("an inline capture response is held on the server and viewers only get a small notice", () => {
  const viewerPayloads: unknown[] = [];
  const unsubscribe = subscribeSession(collectionGuid, "org-a", "user-a", "Viewer", (event, data) => {
    if (event === "phone_camera_message") viewerPayloads.push(data);
  });
  relayPhoneCameraMessage("org-a", collectionGuid, {
    kind: "capture_response",
    requestId: "request-2",
    imageDataUrl: `data:image/jpeg;base64,${Buffer.from("photo").toString("base64")}`,
  });
  unsubscribe();
  assert.deepEqual(viewerPayloads, [
    { kind: "capture_response", requestId: "request-2", imageIsStoredOnServer: true },
  ]);
  assert.equal(takePhoneCameraCapture("org-a", collectionGuid, "request-2")?.bytes.toString(), "photo");
});
