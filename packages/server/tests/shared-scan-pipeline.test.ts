import assert from "node:assert/strict";
import { test } from "node:test";
import {
  identifyScanImage,
  identifyScanWithConsensus,
  type CardSearchResult,
  type OcrDiagnostics,
  type PlayingCardWithDistance,
  type ScanOrientation,
} from "@magic-vault/shared";

function result(
  id: string | null,
  distance = 0.2,
  uncertain = false,
): CardSearchResult {
  return {
    success: true,
    message: "",
    nearestDistance: distance,
    data: id ? [{ cardId: id, distance, confidence: 0.9 }] : [],
    ...(uncertain ? { diagnostics: { reason: "ambiguous" } } : {}),
  } as CardSearchResult;
}

function candidate(orientation: ScanOrientation, match: CardSearchResult) {
  return { orientation, result: match, embedding: [1], image: orientation };
}

test("a confident scan uses the same orientation decision without calling OCR", async () => {
  let textReads = 0;
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    ocrEnabled: true,
    search: async (orientation) =>
      candidate(orientation, result(orientation === "rotated" ? "card" : null)),
    readText: async (image) => {
      textReads++;
      return { ...image, ocr: null };
    },
  });
  assert.equal(outcome.pick.orientation, "rotated");
  assert.equal(outcome.matchedBy, "embedding");
  assert.equal(textReads, 0);
});

test("OCR compares both orientations and favors printing confirmation over name similarity", async () => {
  const reads: string[] = [];
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    ocrEnabled: true,
    search: async (orientation) =>
      candidate(orientation, result("image-card", 0.2, true)),
    readText: async (image) => {
      reads.push(image.orientation);
      const confirmed = image.orientation === "rotated";
      return {
        ...image,
        result: result(confirmed ? "confirmed-card" : "name-card"),
        ocr: {
          printingConfirmed: confirmed,
          nameScore: confirmed ? 0.8 : 1,
        } as OcrDiagnostics,
      };
    },
  });
  assert.deepEqual(reads.sort(), ["rotated", "upright"]);
  assert.equal(outcome.pick.result.data?.[0].cardId, "confirmed-card");
  assert.equal(outcome.matchedBy, "ocr");
  assert.equal(outcome.lowConfidenceMatch, false);
});

test("unsuccessful OCR keeps image matches while retaining OCR diagnostics", async () => {
  const ocr = { nameScore: 0.5 } as OcrDiagnostics;
  const outcome = await identifyScanImage({
    checkBothOrientations: false,
    ocrEnabled: true,
    search: async (orientation) =>
      candidate(orientation, result("image-card", 0.2, true)),
    readText: async (image) => ({ ...image, result: result(null), ocr }),
  });
  assert.equal(outcome.pick.result.data?.[0].cardId, "image-card");
  assert.equal(outcome.ocr, ocr);
  assert.equal(outcome.matchedBy, "embedding");
});

test("high-accuracy scans read OCR on confident images but keep an unconfirmed image printing", async () => {
  let reads = 0;
  const outcome = await identifyScanImage({
    checkBothOrientations: false,
    ocrMode: "every-scan",
    search: async (orientation) => candidate(orientation, result("image-card")),
    readText: async (image) => {
      reads++;
      return {
        ...image,
        result: result("text-card"),
        ocr: { printingConfirmed: false } as OcrDiagnostics,
      };
    },
  });
  assert.equal(reads, 1);
  assert.equal(outcome.pick.result.data?.[0].cardId, "image-card");
  assert.equal(outcome.matchedBy, "embedding");
});

test("printed-language OCR can replace a confident image in another language", async () => {
  const image = result("english");
  image.data![0].lang = "en";
  const outcome = await identifyScanImage({
    checkBothOrientations: false,
    ocrMode: "every-scan",
    search: async (orientation) => candidate(orientation, image),
    readText: async (captured) => ({
      ...captured,
      result: result("german"),
      ocr: { scopedToPrintedLanguage: "de" } as OcrDiagnostics,
    }),
  });
  assert.equal(outcome.pick.result.data?.[0].cardId, "german");
  assert.equal(outcome.matchedBy, "ocr");
});

test("OCR started alongside image search is reused without a second OCR pass", async () => {
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    ocrMode: "every-scan",
    search: async (orientation) => ({
      ...candidate(orientation, result("image")),
      textResult: {
        ...result(orientation === "rotated" ? "confirmed" : "unconfirmed"),
        ocr: { printingConfirmed: orientation === "rotated" } as OcrDiagnostics,
      },
    }),
    readText: async () => {
      throw new Error("OCR repeated");
    },
  });
  assert.equal(outcome.pick.image, "rotated");
  assert.equal(outcome.pick.result.data?.[0].cardId, "confirmed");
});

test("consensus retries and picks the best agreeing frame", async () => {
  const card = (name: string, distance: number) =>
    ({ id: name, name, distance }) as PlayingCardWithDistance;
  const frames = [
    { card: card("A", 0.2) },
    { card: card("B", 0.1) },
    { card: card("A", 0.1) },
  ];
  let captures = 0;
  const outcome = await identifyScanWithConsensus(
    async () => frames[captures++],
    (frame) => frame.card,
    2,
  );
  assert.equal(captures, 3);
  assert.equal(outcome.attempt, frames[2]);
  assert.equal(outcome.card?.name, "A");
  assert.equal(outcome.attempts.length, 3);
});

test("failed consensus does not route the last individually matched card", async () => {
  let captures = 0;
  const outcome = await identifyScanWithConsensus(
    async () => ({
      card: {
        id: `${captures}`,
        name: `Card ${captures++}`,
        distance: 0.1,
      } as PlayingCardWithDistance,
    }),
    (frame) => frame.card,
    2,
  );
  assert.equal(outcome.card, null);
  assert.ok(outcome.attempt.card);
  assert.equal(outcome.attempts.length, captures);
  assert.ok(captures > 2);
});
