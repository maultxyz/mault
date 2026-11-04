import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectFoilRgba,
  measureFoilFeatures,
  resolveScanFoilType,
  supportsFoilDetection,
  type FoilDetection,
  type PlayingCard,
  type RgbaImage,
} from "@magic-vault/shared";

const SIZE = 200;

function hslToRgb(hueDegrees: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hueDegrees / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] =
    section < 1 ? [chroma, second, 0]
    : section < 2 ? [second, chroma, 0]
    : section < 3 ? [0, chroma, second]
    : section < 4 ? [0, second, chroma]
    : section < 5 ? [second, 0, chroma]
    : [chroma, 0, second];
  const match = lightness - chroma / 2;
  return [red, green, blue].map((value) => Math.round((value + match) * 255)) as [number, number, number];
}

function cardImage(colorAt: (x: number, y: number) => [number, number, number], channelOrder?: "bgra"): RgbaImage {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [red, green, blue] = colorAt(x, y);
      const offset = (y * SIZE + x) * 4;
      data[offset] = channelOrder === "bgra" ? blue : red;
      data[offset + 1] = green;
      data[offset + 2] = channelOrder === "bgra" ? red : blue;
      data[offset + 3] = 255;
    }
  }
  return { width: SIZE, height: SIZE, data, channelOrder };
}

const rainbowTextBox = cardImage((x) => hslToRgb(((x / SIZE) * 720) % 360, 0.6, 0.6));
const beigeTextBox = cardImage(() => [232, 220, 196]);
const tintedBlueTextBox = cardImage((x) => hslToRgb(210 + (x / SIZE) * 20, 0.5, 0.65));
const warmAndCoolTintedTextBox = cardImage((x) => (x < SIZE / 2 ? hslToRgb(25, 0.6, 0.6) : hslToRgb(190, 0.6, 0.6)));
const faintlyTintedGreyTextBox = cardImage((x) => hslToRgb(((x / SIZE) * 720) % 360, 0.35, 0.75));

const detectedFoil: FoilDetection = { method: "rainbow", foilScore: 0.8, isFoilDetected: true };
const notFoil: FoilDetection = { method: "rainbow", foilScore: 0.01, isFoilDetected: false };
const card = { id: "a", name: "Card" } as PlayingCard;

test("only Magic supports foil detection", () => {
  assert.equal(supportsFoilDetection("mtg"), true);
  assert.equal(supportsFoilDetection("pokemon"), false);
  assert.equal(supportsFoilDetection(null), false);
  assert.equal(detectFoilRgba(rainbowTextBox, "pokemon"), null);
});

test("a rainbow sheen across the text box is detected as foil", () => {
  const detection = detectFoilRgba(rainbowTextBox, "mtg");
  assert.ok(detection);
  assert.equal(detection.isFoilDetected, true);
  assert.ok(detection.foilScore > 0.6);
});

test("flat and single-tint text boxes are not foil", () => {
  assert.deepEqual(detectFoilRgba(beigeTextBox, "mtg"), { method: "rainbow", foilScore: 0, isFoilDetected: false });
  const tinted = detectFoilRgba(tintedBlueTextBox, "mtg");
  assert.ok(tinted);
  assert.equal(tinted.isFoilDetected, false);
  assert.ok(tinted.foilScore < 0.05);
});

test("faint tints on a grey text box are not mistaken for a rainbow", () => {
  assert.ok(measureFoilFeatures(faintlyTintedGreyTextBox).lowerHueSpread > 0.6);
  assert.deepEqual(detectFoilRgba(faintlyTintedGreyTextBox, "mtg"), { method: "rainbow", foilScore: 0, isFoilDetected: false });
});

test("a warm and cool lighting tint is not mistaken for a rainbow", () => {
  assert.ok(measureFoilFeatures(warmAndCoolTintedTextBox).lowerHueSpread > 0.8);
  assert.deepEqual(detectFoilRgba(warmAndCoolTintedTextBox, "mtg"), { method: "rainbow", foilScore: 0, isFoilDetected: false });
});

test("bgra images measure the same as rgba", () => {
  const bgra = cardImage((x) => hslToRgb(((x / SIZE) * 720) % 360, 0.6, 0.6), "bgra");
  assert.deepEqual(measureFoilFeatures(bgra), measureFoilFeatures(rainbowTextBox));
});

test("the scanner's foil setting wins over detection", () => {
  assert.equal(resolveScanFoilType(card, "Etched", notFoil, ["Traditional"]), "Etched");
  assert.equal(resolveScanFoilType(card, null, null, ["Traditional"]), null);
  assert.equal(resolveScanFoilType(card, null, notFoil, ["Traditional"]), null);
});

test("foil-only printings keep their finish whatever detection says", () => {
  const foilOnly = { ...card, foilOnlyFoilType: "Holo" } as PlayingCard;
  assert.equal(resolveScanFoilType(foilOnly, null, notFoil, ["Holo"]), "Holo");
});

test("a detected foil uses the card's finish family, then the game's", () => {
  assert.equal(resolveScanFoilType(card, null, detectedFoil, ["Traditional"]), "Traditional");
  assert.equal(resolveScanFoilType(card, null, detectedFoil, []), null);
  const reverseOnly = { ...card, foilTypes: ["Reverse Holo"] } as PlayingCard;
  assert.equal(
    resolveScanFoilType(reverseOnly, null, detectedFoil, ["Holo", "Reverse Holo"]),
    "Reverse Holo",
  );
});
