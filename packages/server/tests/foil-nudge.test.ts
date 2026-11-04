import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectFoilFromNudges,
  foilNudgeCommands,
  foilNudgePusherPulse,
  isFoilNudgeReplyOk,
  measureAlignedFoilNudgeChange,
  measureFoilNudgeChange,
  parseFoilNudgeFirmwareLimits,
  type FoilNudgeFirmwareLimits,
  type RgbaImage,
  type ServoCalibration,
} from "@magic-vault/shared";

const WIDTH = 200;
const HEIGHT = 280;

function cardImage(colorAt: (x: number, y: number) => [number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const [red, green, blue] = colorAt(x, y);
      const offset = (y * WIDTH + x) * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

const artwork = (x: number, y: number): [number, number, number] => [
  80 + ((x * 3) % 90),
  60 + ((y * 5) % 110),
  90 + (((x + y) * 2) % 80),
];

function withSheenAt(centerX: number, centerY: number) {
  return (x: number, y: number): [number, number, number] => {
    const [red, green, blue] = artwork(x, y);
    const glow = Math.max(0, 1 - Math.hypot(x - centerX, y - centerY) / 60) * 120;
    return [red + glow, green + glow, blue + glow];
  };
}

const calibration: ServoCalibration = {
  bottomClosed: 300,
  bottomOpen: 450,
  paddleClosed: 300,
  paddleOpen: 420,
  pusherLeft: 200,
  pusherNeutral: 400,
  pusherRight: 600,
  pusherHoldDuration: 300,
  paddleCloseDelay: 300,
  paddleOpenDelay: 300,
};

const firmwareLimits: FoilNudgeFirmwareLimits = { maxPulse: 20, maxTravelPercent: 50 };

test("the nudges move the pusher 18 pulse units from neutral each way", () => {
  assert.equal(foilNudgePusherPulse(calibration, firmwareLimits, "left"), 382);
  assert.equal(foilNudgePusherPulse(calibration, firmwareLimits, "right"), 418);
  assert.deepEqual(foilNudgeCommands(calibration, firmwareLimits), {
    nudges: [
      { direction: "left", command: { servo: "pusher", module: 1, value: 382 } },
      { direction: "right", command: { servo: "pusher", module: 1, value: 418 } },
    ],
    restorePusher: { servo: "pusher", module: 1, position: "neutral" },
  });
});

test("pushers with short travel get a smaller nudge that keeps clear of the paddle", () => {
  const shortLeft = { ...calibration, pusherNeutral: 320, pusherLeft: 290 };
  assert.equal(foilNudgePusherPulse(shortLeft, firmwareLimits, "left"), 308);
});

test("the nudges never go past the limits the firmware reports", () => {
  assert.equal(foilNudgePusherPulse(calibration, { maxPulse: 10, maxTravelPercent: 50 }, "left"), 390);
  const noRoomLeft = { ...calibration, pusherLeft: 398 };
  assert.equal(foilNudgePusherPulse(noRoomLeft, firmwareLimits, "left"), null);
  assert.deepEqual(
    foilNudgeCommands(noRoomLeft, firmwareLimits)?.nudges.map((nudge) => nudge.direction),
    ["right"],
  );
  assert.equal(
    foilNudgeCommands({ ...noRoomLeft, pusherRight: 402 }, firmwareLimits),
    null,
  );
});

test("firmware without nudge limits in its status gets no nudge", () => {
  assert.equal(parseFoilNudgeFirmwareLimits({ status: "ready", version: "2.13.0" }), null);
  assert.equal(parseFoilNudgeFirmwareLimits(null), null);
  assert.deepEqual(
    parseFoilNudgeFirmwareLimits({ pusherNudgeMaxPulse: 20, pusherNudgeMaxTravelPercent: 50 }),
    firmwareLimits,
  );
});

test("servo replies count as ok only when the firmware says so", () => {
  assert.equal(isFoilNudgeReplyOk('{"status":"ok","servo":"pusher","module":1}'), true);
  assert.equal(isFoilNudgeReplyOk('{"error":"invalid position"}'), false);
  assert.equal(isFoilNudgeReplyOk("not json"), false);
});

test("an unchanged card shows no change", () => {
  const before = cardImage(artwork);
  const change = measureFoilNudgeChange(before, cardImage(artwork));
  assert.equal(change.meanCellChange, 0);
  assert.equal(change.changedCellShare, 0);
});

test("an overall exposure and white balance shift is not counted as a change", () => {
  const before = cardImage(artwork);
  const brighter = cardImage((x, y) => {
    const [red, green, blue] = artwork(x, y);
    return [red * 1.2, green * 1.15, blue * 1.1];
  });
  assert.ok(measureFoilNudgeChange(before, brighter).meanCellChange < 0.01);
  assert.equal(detectFoilFromNudges(before, { left: brighter, right: brighter }, "mtg")?.isFoilDetected, false);
});

test("a sheen that only changes on one side is still detected as foil", () => {
  const before = cardImage(withSheenAt(60, 90));
  const after = cardImage(withSheenAt(140, 90));
  const detection = detectFoilFromNudges(before, { left: cardImage(withSheenAt(60, 90)), right: after }, "mtg");
  assert.equal(detection?.method, "nudge");
  assert.equal(detection?.isFoilDetected, true);
  assert.ok((detection?.nudgeChange?.changedCellShare ?? 0) > 0.1);
  assert.equal(detection?.nudgeChangesByDirection?.left?.meanCellChange, 0);
});

test("white glare counts as change but not as a colour-only change", () => {
  const before = cardImage(artwork);
  const glare = cardImage((x, y) => {
    const [red, green, blue] = artwork(x, y);
    const white = Math.max(0, 1 - Math.hypot(x - 100, y - 140) / 70) * 90;
    return [red + white, green + white, blue + white];
  });
  const change = measureFoilNudgeChange(before, glare);
  assert.ok(change.meanCellChange > 0.05);
  assert.ok(change.colourOnlyChange < 0.002);
});

test("a shift in colour shows up as a colour-only change", () => {
  const before = cardImage(artwork);
  const tinted = cardImage((x, y) => {
    const [red, green, blue] = artwork(x, y);
    const sheen = Math.max(0, 1 - Math.hypot(x - 100, y - 140) / 70);
    return [red - 40 * sheen, green + 60 * sheen, blue - 20 * sheen];
  });
  assert.ok(measureFoilNudgeChange(before, tinted).colourOnlyChange > 0.01);
});

test("a second photo that comes out upside down is turned back before comparing", () => {
  const before = cardImage(artwork);
  const upsideDown = cardImage((x, y) => artwork(WIDTH - 1 - x, HEIGHT - 1 - y));
  assert.ok(measureFoilNudgeChange(before, upsideDown).meanCellChange > 0.05);
  assert.equal(measureAlignedFoilNudgeChange(before, upsideDown).meanCellChange, 0);
  assert.equal(detectFoilFromNudges(before, { left: upsideDown }, "mtg")?.isFoilDetected, false);
});

test("games without foil detection get no nudge result", () => {
  const image = cardImage(artwork);
  assert.equal(detectFoilFromNudges(image, { left: image }, "pokemon"), null);
  assert.equal(detectFoilFromNudges(image, {}, "mtg"), null);
});
