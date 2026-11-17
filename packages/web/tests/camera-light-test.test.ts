import assert from "node:assert/strict";
import test from "node:test";
import { assertCameraLightPreviewAvailable, assertCameraLightReply, restoreCameraLightAfterPreview } from "../src/features/calibration/lib/camera-light-test.ts";
import { cameraLightTestSchema } from "../src/schemas/camera-light-test.schema.ts";

test("camera preview accepts only temporary supported light settings", () => {
  const valid = { lightMode: "custom", lightColor: "#aabbcc", lightBrightness: 255, lightWhite: 32 };
  assert.equal(cameraLightTestSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, lightMode: "foil" },
    { ...valid, lightColor: "bad" },
    { ...valid, lightBrightness: 256 },
    { ...valid, lightWhite: -1 },
  ]) assert.equal(cameraLightTestSchema.safeParse(invalid).success, false);
});

test("preview verifies lighting state and refuses warning overrides", () => {
  const settings = { lightMode: "white" as const, lightColor: "#ffffff", lightBrightness: 32 };
  const reply = { status: "ok", lightMode: "white", brightness: 32, leds: 126, lightAlert: "none", warningActive: false };
  assertCameraLightReply(JSON.stringify(reply), settings, 126);
  assertCameraLightPreviewAvailable(JSON.stringify(reply));
  assert.throws(() => assertCameraLightReply(JSON.stringify({ ...reply, leds: 65406 }), settings, 126));
  assert.throws(() => assertCameraLightReply(JSON.stringify({ ...reply, status: "error" }), settings, 126));
  assert.throws(() => assertCameraLightPreviewAvailable(JSON.stringify({ ...reply, warningActive: true })));
  assert.throws(() => assertCameraLightPreviewAvailable(JSON.stringify({ ...reply, lightAlert: "jam" })));
});

test("restoration waits for a failed or successful preview and surfaces restoration errors", async () => {
  for (const fail of [false, true]) {
    const events: string[] = [];
    let finish!: () => void;
    const pending = new Promise<void>((resolve, reject) => {
      finish = () => { events.push("preview"); if (fail) reject(new Error("preview failed")); else resolve(); };
    });
    const result = restoreCameraLightAfterPreview(pending, async () => { events.push("restore"); });
    assert.deepEqual(events, []);
    finish();
    await result;
    assert.deepEqual(events, ["preview", "restore"]);
  }
  await assert.rejects(restoreCameraLightAfterPreview(null, async () => { throw new Error("restore failed"); }), /restore failed/);
});
