import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectPrintedLanguageCode,
  detectPrintedLanguageCodeRgba,
  parsePrintedLanguageCodeFormValue,
  printedLanguageCodeFormValue,
  rotateRgba180,
  wholeImageHomography,
  type RgbaImage,
} from "@magic-vault/shared";
import {
  buildCardMatchSegment,
  closestPrintingWithLanguageCode,
  printedLanguageCodeOfCard,
  printedLanguageCodeOfRow,
} from "../src/lib/card-match-search";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";

const WIDTH = 630;
const HEIGHT = 880;
const TEXT_LEFT = 0.969;
const TEXT_RIGHT = 0.981;

interface CardDrawing {
  languageCode: boolean;
  background?: number;
  ink?: number;
  sketchAboveText?: boolean;
}

function fillRect(
  image: RgbaImage,
  left: number,
  top: number,
  right: number,
  bottom: number,
  value: number,
) {
  for (let y = Math.round(top * HEIGHT); y < Math.round(bottom * HEIGHT); y++) {
    for (let x = Math.round(left * WIDTH); x < Math.round(right * WIDTH); x++) {
      const offset = (y * WIDTH + x) * 4;
      image.data[offset] = value;
      image.data[offset + 1] = value;
      image.data[offset + 2] = value;
    }
  }
}

function drawGlyphRun(image: RgbaImage, top: number, glyphs: number, ink: number) {
  for (let index = 0; index < glyphs; index++) {
    const glyphTop = top + index * 0.0075;
    fillRect(image, TEXT_LEFT, glyphTop, TEXT_RIGHT, glyphTop + 0.0055, ink);
  }
}

function onePieceCard({
  languageCode,
  background = 240,
  ink = 60,
  sketchAboveText = false,
}: CardDrawing): RgbaImage {
  const image: RgbaImage = {
    width: WIDTH,
    height: HEIGHT,
    data: new Uint8ClampedArray(WIDTH * HEIGHT * 4).fill(255),
  };
  fillRect(image, 0, 0, 1, 1, background);
  fillRect(image, 0.955, 0, 0.958, 1, 30);
  drawGlyphRun(image, 0.69, 6, ink);
  drawGlyphRun(image, 0.74, 4, ink);
  drawGlyphRun(image, 0.775, 2, ink);
  drawGlyphRun(image, 0.795, 5, ink);
  if (languageCode) drawGlyphRun(image, 0.656, 2, ink);
  if (sketchAboveText) {
    fillRect(image, 0.96, 0.66, 0.99, 0.664, ink);
    fillRect(image, 0.985, 0.645, 0.99, 0.672, ink);
  }
  return image;
}

test("finds the EN printed above the BANDAI line", () => {
  const detection = detectPrintedLanguageCodeRgba(
    onePieceCard({ languageCode: true }),
    "onepiece",
  );
  assert.equal(detection?.present, true);
});

test("reports no EN on cards printed before the language code", () => {
  const detection = detectPrintedLanguageCodeRgba(
    onePieceCard({ languageCode: false }),
    "onepiece",
  );
  assert.equal(detection?.present, false);
});

test("reads white text on a colored border the same way", () => {
  assert.equal(
    detectPrintedLanguageCodeRgba(
      onePieceCard({ languageCode: true, background: 50, ink: 235 }),
      "onepiece",
    )?.present,
    true,
  );
  assert.equal(
    detectPrintedLanguageCodeRgba(
      onePieceCard({ languageCode: false, background: 50, ink: 235 }),
      "onepiece",
    )?.present,
    false,
  );
});

test("a card scanned upside down is read through the rotated orientation", () => {
  const rotated = rotateRgba180(onePieceCard({ languageCode: true }));
  const detection = detectPrintedLanguageCode(
    rotated,
    wholeImageHomography(rotated),
    "onepiece",
    "rotated",
  );
  assert.equal(detection?.present, true);
});

test("ink that is not a language code beside the text is unknown, never EN", () => {
  const detection = detectPrintedLanguageCodeRgba(
    onePieceCard({ languageCode: false, sketchAboveText: true }),
    "onepiece",
  );
  assert.equal(detection?.present, null);
});

test("games without a language code band are not read", () => {
  assert.equal(
    detectPrintedLanguageCodeRgba(onePieceCard({ languageCode: true }), "mtg"),
    null,
  );
});

test("the detection round-trips through the search form", () => {
  assert.equal(parsePrintedLanguageCodeFormValue(printedLanguageCodeFormValue(true)), true);
  assert.equal(parsePrintedLanguageCodeFormValue(printedLanguageCodeFormValue(false)), false);
  assert.equal(printedLanguageCodeFormValue(null), null);
  assert.equal(parsePrintedLanguageCodeFormValue("maybe"), null);
});

function indexRow(
  cardId: string,
  printedLanguageCode: boolean | null,
  rarePrinting: boolean,
  embeddingValue: number,
) {
  const embedding = new Float32Array(MILO_EMBEDDING_DIM).fill(1);
  embedding[0] = embeddingValue;
  return {
    cardId,
    name: "Limejuice",
    setCode: "OP09",
    collectorNumber: "OP09-014",
    rarePrinting,
    promoPrinting: false,
    printedLanguageCode,
    embedding,
    backEmbedding: null,
  };
}

test("the match index picks the closest printing with the detected language code", () => {
  const segment = buildCardMatchSegment("onepiece", "en", [
    indexRow("OP09-014", false, false, 1),
    indexRow("OP09-014_r1", true, true, 1.2),
    indexRow("OP09-014_r2", true, true, 1),
    indexRow("OP09-014_p1", null, false, 1),
  ]);
  assert.equal(printedLanguageCodeOfRow(segment, 0), false);
  assert.equal(printedLanguageCodeOfRow(segment, 1), true);
  assert.equal(printedLanguageCodeOfRow(segment, 3), null);
  assert.equal(printedLanguageCodeOfCard([segment], "OP09-014_r1"), true);
  assert.equal(printedLanguageCodeOfCard([segment], "missing"), null);

  const query = new Float32Array(MILO_EMBEDDING_DIM).fill(1);
  const withCode = closestPrintingWithLanguageCode([segment], "Limejuice", true, query);
  assert.equal(withCode?.row, 2);
  const withoutCode = closestPrintingWithLanguageCode([segment], "Limejuice", false, query);
  assert.equal(withoutCode?.row, 0);
});
