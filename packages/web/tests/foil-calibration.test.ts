import assert from "node:assert/strict";
import test from "node:test";
import { assertFoilLightingReply, captureFoilSequence, foilCaptureSteps, foilExperimentSteps, waitForFoilExposure, withFoilLedMask } from "../src/features/calibration/lib/foil-capture-sequence.ts";
import { FOIL_CALIBRATION_STEPS } from "../src/lib/constants/foil-calibration.ts";
import { foilCalibrationLabelSchema } from "../src/schemas/foil-calibration.schema.ts";
import type { FoilCaptureFrame, FoilCaptureSequenceOptions } from "../src/lib/interfaces/foil-calibration.ts";

function fixture() {
  const events: string[] = [];
  const controller = new AbortController();
  const options: FoilCaptureSequenceOptions = {
    steps: FOIL_CALIBRATION_STEPS,
    restore: { lightMode: "off", lightBrightness: 160, lightColor: "#123456" },
    signal: controller.signal,
    settleMs: 1000,
    setLight: async (settings) => { events.push(`light:${settings.lightMode}:${settings.lightColor}`); },
    capture: async (step): Promise<FoilCaptureFrame> => {
      events.push(`capture:${step.id}`);
      return { step: step.id, lighting: step.lighting, capturedAt: "now", width: 1, height: 1,
        image: "image", meanBrightness: 0, clippedFraction: 0 };
    },
    wait: async (ms) => { events.push(`wait:${ms}`); },
    onStep: (id) => { events.push(`step:${id}`); },
  };
  return { events, controller, options };
}

test("selected brightness reaches every lighting command without mutating defaults or restoration", async () => {
  const { options } = fixture();
  options.steps = foilCaptureSteps(48);
  const brightness: number[] = [];
  options.setLight = async (settings) => { brightness.push(settings.lightBrightness); };
  const frames = await captureFoilSequence(options);
  assert.deepEqual(brightness, [48, 48, 48, 48, 48, 48, 160]);
  assert.ok(frames.every((frame) => frame.lighting.lightBrightness === 48));
  assert.ok(FOIL_CALIBRATION_STEPS.every((step) => step.lighting.lightBrightness === 96));
  for (const invalid of [0, -1, 256, 1.5, NaN, Infinity]) assert.throws(() => foilCaptureSteps(invalid));
});
test("six correctly ordered lighting captures settle after acknowledgements and restore last", async () => {
  const { events, options } = fixture();
  const frames = await captureFoilSequence(options);
  assert.deepEqual(frames.map((frame) => frame.step), ["ambient", "white", "red", "green", "blue", "whiteRepeat"]);
  const expected = FOIL_CALIBRATION_STEPS.flatMap((step) => [
    `step:${step.id}`, `light:${step.lighting.lightMode}:${step.lighting.lightColor}`, "wait:1000", `capture:${step.id}`,
  ]);
  assert.deepEqual(events, [...expected, "light:off:#123456"]);
});

test("brightness experiment captures each state twice, then restores", async () => {
  const { options } = fixture();
  options.steps = foilExperimentSteps("brightness", 96);
  const commands: string[] = [];
  options.setLight = async (light) => { commands.push(`${light.lightMode}:${light.lightBrightness}`); };
  const frames = await captureFoilSequence(options);
  assert.deepEqual(frames.map((frame) => frame.step),
    ["ambient", "white", "whiteBright", "whiteRepeat", "whiteBrightRepeat", "ambientRepeat"]);
  assert.deepEqual(commands, ["off:4", "white:4", "white:12", "white:4", "white:12", "off:4", "off:160"]);
  assert.deepEqual(frames.map((frame) => frame.lighting.lightBrightness), [4, 4, 12, 4, 12, 4]);
  assert.deepEqual(foilExperimentSteps("color", 48), foilCaptureSteps(48));
  options.steps[0].lighting.lightBrightness = 200;
  assert.equal(foilExperimentSteps("brightness", 48)[0].lighting.lightBrightness, 4);
});

test("capture failure restores the original lighting and returns no partial sample", async () => {
  const { events, options } = fixture();
  options.capture = async () => { throw new Error("camera lost"); };
  await assert.rejects(captureFoilSequence(options), /camera lost/);
  assert.equal(events.at(-1), "light:off:#123456");
});

test("cancellation during settling stops photos and restores lighting", async () => {
  const { events, options, controller } = fixture();
  options.wait = async () => { controller.abort(); };
  await assert.rejects(captureFoilSequence(options), { name: "AbortError" });
  assert.equal(events.some((event) => event.startsWith("capture:")), false);
  assert.equal(events.at(-1), "light:off:#123456");
});

test("failed acknowledgement stops photos and still attempts restoration", async () => {
  const { events, options } = fixture();
  options.setLight = async (settings) => {
    events.push(settings.lightColor);
    if (settings.lightColor !== "#123456") throw new Error("no acknowledgement");
  };
  await assert.rejects(captureFoilSequence(options), /no acknowledgement/);
  assert.deepEqual(events, ["step:ambient", "#000000", "#123456"]);
});

test("restoration failure is reported rather than returning a successful sequence", async () => {
  const { options } = fixture();
  options.setLight = async (settings) => {
    if (settings.lightColor === "#123456") throw new Error("restore failed");
  };
  await assert.rejects(captureFoilSequence(options), /restore failed/);
});

test("firmware acknowledgement uses brightness and rejects active alerts or mismatched state", () => {
  const settings = FOIL_CALIBRATION_STEPS[1].lighting;
  const valid = { status: "ok", lightMode: "white", brightness: 96, lightAlert: "none" };
  assert.doesNotThrow(() => assertFoilLightingReply(JSON.stringify(valid), settings));
  for (const invalid of [
    null, {}, { ...valid, status: "error" }, { ...valid, lightMode: "off" },
    { ...valid, brightness: 255 }, { ...valid, lightAlert: "jam" },
    { ...valid, lightAlert: "empty" }, { ...valid, lightAlert: "value" },
    { status: "ok", lightMode: "white", lightBrightness: 96, lightAlert: "none" },
  ]) assert.throws(() => assertFoilLightingReply(JSON.stringify(invalid), settings));
  assert.throws(() => assertFoilLightingReply("not json", settings));
});

test("exposure wait aborts promptly", async () => {
  const controller = new AbortController();
  const waiting = waitForFoilExposure(10000, controller.signal);
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
});

test("labels require a known binary finish and a nonempty card identification", () => {
  const valid = { card: "Example / ABC / 1", finish: "foil", sleeved: false, notes: "", brightness: 48, captureMode: "color" };
  assert.equal(foilCalibrationLabelSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, card: "   " }, { ...valid, finish: "etched" },
    { ...valid, finish: "unknown" }, { ...valid, notes: "x".repeat(1001) },
    { ...valid, brightness: 0 }, { ...valid, brightness: 256 }, { ...valid, brightness: 1.5 },
    { ...valid, brightness: NaN },
  ]) assert.equal(foilCalibrationLabelSchema.safeParse(invalid).success, false);
});

test("direction sequence lights the diffused middle, LED 0 and LED 7 separately and checks the echoed mask", () => {
  const steps = foilExperimentSteps("direction", 48);
  assert.deepEqual(foilExperimentSteps("direction", 48, 8).map((step) => step.lighting.ledMask),
    [126, 126, 126, 1, 128, 1, 128]);
  assert.deepEqual(foilExperimentSteps("staged", 48, 8).map((step) => step.lighting.ledMask),
    [126, 126, 126, 126, 126, 1, 128, 1, 128]);
  assert.deepEqual(steps.map((step) => `${step.id}:${step.lighting.lightMode}:${step.lighting.lightBrightness}:${step.lighting.ledMask ?? "all"}`),
    ["ambient:off:12:65406", "whiteBright:white:12:65406", "diffuse:white:32:65406", "led0:white:32:1", "led7:white:32:128", "led0Repeat:white:32:1", "led7Repeat:white:32:128"]);
  const command = { setLight: { mode: "white", brightness: 32 } };
  assert.deepEqual(withFoilLedMask(command, 128), { setLight: { mode: "white", brightness: 32, leds: 128, suppressWarnings: true } });
  assert.equal(withFoilLedMask(command, undefined), command);
  const settings = steps[4].lighting;
  assertFoilLightingReply('{"status":"ok","lightMode":"white","lightAlert":"none","brightness":32,"leds":128}', settings);
  assert.throws(() => assertFoilLightingReply('{"status":"ok","lightMode":"white","lightAlert":"none","brightness":32}', settings), /LED direction/);
  assert.throws(() => assertFoilLightingReply('{"status":"ok","lightMode":"white","lightAlert":"none","brightness":32,"leds":31}', settings), /LED direction/);
  assertFoilLightingReply('{"status":"ok","lightMode":"white","lightAlert":"none","brightness":12,"leds":65406}', steps[1].lighting);
  assert.throws(() => assertFoilLightingReply('{"status":"ok","lightMode":"white","lightAlert":"none","brightness":12,"leds":31}', steps[1].lighting), /LED direction/);
});

test("staged capture brackets main lighting before verifying every card with the exposed LEDs", async () => {
  const { options } = fixture();
  options.steps = foilExperimentSteps("staged", 48);
  assert.deepEqual(options.steps.map((step) =>
    `${step.id}:${step.lighting.lightBrightness}:${step.lighting.ledMask}`),
  ["ambient:12:65406", "whiteBright:32:65406", "white:8:65406", "whiteHigh:96:65406",
    "whiteBrightRepeat:32:65406", "led0:32:1", "led7:32:128", "led0Repeat:32:1", "led7Repeat:32:128"]);
  const frames = await captureFoilSequence(options);
  assert.equal(frames.length, 9);
  assert.deepEqual(frames.slice(5).map((frame) => frame.lighting.ledMask), [1, 128, 1, 128]);
  options.steps[1].lighting.lightBrightness = 200;
  assert.equal(foilExperimentSteps("staged", 48)[1].lighting.lightBrightness, 32);
  assert.equal(foilCalibrationLabelSchema.safeParse({
    card: "Example", finish: "foil", sleeved: false, notes: "", brightness: 48, captureMode: "staged",
  }).success, true);
});
