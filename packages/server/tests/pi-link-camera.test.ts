import assert from "node:assert/strict";
import { test } from "node:test";
import { createPiLinkCameraFeed, piLinkCameraRuntime } from "../src/lib/pi-link-device/camera";

test("the Pi sends shrunken camera frames only while someone is watching", async () => {
  const cameraIds: (string | undefined)[] = [];
  let releaseWait: () => void = () => {};
  piLinkCameraRuntime.readFrame = async (cameraId) => {
    cameraIds.push(cameraId);
    return Buffer.from("full-size");
  };
  piLinkCameraRuntime.shrinkFrame = async (jpeg) => Buffer.from(`small:${jpeg.toString()}`);
  piLinkCameraRuntime.wait = () => new Promise<void>((resolve) => (releaseWait = resolve));
  const sent: string[] = [];
  let backedUp = false;
  const feed = createPiLinkCameraFeed((image) => sent.push(image), () => "usb-1", {
    isBackedUp: () => backedUp,
    isScanning: () => false,
  });

  feed.setWatching(true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent.map((image) => Buffer.from(image, "base64").toString()), ["small:full-size"]);
  assert.deepEqual(cameraIds, ["usb-1"]);

  backedUp = true;
  releaseWait();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);
  assert.equal(cameraIds.length, 1);

  feed.setWatching(false);
  backedUp = false;
  releaseWait();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);
});

test("the feed slows down while a scan is running", async () => {
  const waits: number[] = [];
  piLinkCameraRuntime.readFrame = async () => Buffer.from("frame");
  piLinkCameraRuntime.shrinkFrame = async (jpeg) => jpeg;
  piLinkCameraRuntime.wait = (ms) => {
    waits.push(ms);
    return new Promise<void>(() => {});
  };
  const feed = createPiLinkCameraFeed(() => {}, () => undefined, {
    isBackedUp: () => false,
    isScanning: () => true,
  });
  feed.setWatching(true);
  await new Promise((resolve) => setImmediate(resolve));
  feed.stop();
  assert.deepEqual(waits, [1500]);
});

test("a failed frame is skipped and the feed keeps going", async () => {
  let attempt = 0;
  piLinkCameraRuntime.readFrame = async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("camera busy");
    return Buffer.from("frame");
  };
  piLinkCameraRuntime.shrinkFrame = async (jpeg) => jpeg;
  piLinkCameraRuntime.wait = async () => {};
  const sent: string[] = [];
  const feed = createPiLinkCameraFeed(
    (image) => {
      sent.push(image);
      feed.stop();
    },
    () => undefined,
    { isBackedUp: () => false, isScanning: () => false },
  );
  feed.setWatching(true);
  for (let tick = 0; tick < 5 && sent.length === 0; tick++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);
});
