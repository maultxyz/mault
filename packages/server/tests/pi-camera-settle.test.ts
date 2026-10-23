import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { grabCameraFrame, grabSettledCameraFrame } from "../src/lib/pi-scan/camera";

const picture = (value: number) => sharp({ create: { width: 80, height: 80, channels: 3, background: { r: value, g: value, b: value } } }).jpeg().toBuffer();

test("waits through movement and returns a settled frame", async () => {
  const images = await Promise.all([0, 80, 160, 80, 81, 80, 81].map(picture));
  let grabs = 0;
  const result = await grabSettledCameraFrame(async () => images[grabs++], async () => {});
  assert.equal(grabs, 7);
  assert.equal(result, images[6]);
});

test("continued movement fails instead of submitting a blurred card", async () => {
  const images = await Promise.all([20, 160].map(picture));
  let grabs = 0;
  await assert.rejects(grabSettledCameraFrame(async () => images[grabs++ % 2], async () => {}), /did not settle/);
  assert.equal(grabs, 30);
});

test("scanner requests a fresh JPEG rather than the buffered preview", async (t) => {
  const jpeg = await picture(100);
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(new URL(url).searchParams.get("fresh"), "1");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    return new Response(new Uint8Array(jpeg));
  });
  assert.deepEqual(await grabCameraFrame(), jpeg);
});
