import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARD_SETTLE_STABLE_TICKS,
  createCardSettleTracker,
  IDENTIFY_REQUEST_RETRY_DELAYS_MS,
  identifyScanImage,
  identifyScanWithConsensus,
  isConfidentOrientationMatch,
  PREFERRED_ORIENTATION_MAX_DISTANCE,
  requestIdentifyWithRetries,
  ScanIdentifyRequestError,
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

function closeRunnerUp(id: string): CardSearchResult {
  return {
    success: true,
    message: "",
    nearestDistance: 0.2,
    data: [
      { cardId: id, distance: 0.2, confidence: 0.9 },
      { cardId: `${id}-reprint`, distance: 0.21, confidence: 0.9 },
    ],
  } as CardSearchResult;
}

test("a confident preferred orientation skips the other orientation", async () => {
  const searched: ScanOrientation[] = [];
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "rotated",
    search: async (orientation) => {
      searched.push(orientation);
      return candidate(orientation, result("card", 0.1));
    },
  });
  assert.deepEqual(searched, ["rotated"]);
  assert.equal(outcome.pick.orientation, "rotated");
  assert.equal(outcome.alternate, null);
});

test("an unmatched preferred orientation falls back to the other orientation", async () => {
  const searched: ScanOrientation[] = [];
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "upright",
    search: async (orientation) => {
      searched.push(orientation);
      return candidate(
        orientation,
        result(orientation === "rotated" ? "card" : null, 0.1),
      );
    },
  });
  assert.deepEqual(searched, ["upright", "rotated"]);
  assert.equal(outcome.pick.orientation, "rotated");
  assert.equal(outcome.alternate?.orientation, "upright");
});

test("a preferred orientation that matches beyond the confidence distance still checks the other", async () => {
  const searched: ScanOrientation[] = [];
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "upright",
    search: async (orientation) => {
      searched.push(orientation);
      return candidate(
        orientation,
        result("card", orientation === "upright" ? 0.35 : 0.1),
      );
    },
  });
  assert.deepEqual(searched, ["upright", "rotated"]);
  assert.equal(outcome.pick.orientation, "rotated");
});

test("a preferred orientation is accepted alone only for a close image match", () => {
  assert.equal(isConfidentOrientationMatch(result("card", 0.1)), true);
  assert.equal(isConfidentOrientationMatch(result("card", 0.1, true)), true);
  assert.equal(isConfidentOrientationMatch(closeRunnerUp("card")), true);
  assert.equal(isConfidentOrientationMatch(result(null)), false);
  assert.equal(
    isConfidentOrientationMatch(
      result("card", PREFERRED_ORIENTATION_MAX_DISTANCE + 0.01),
    ),
    false,
  );
});

test("a single orientation setting ignores the preferred orientation", async () => {
  const searched: ScanOrientation[] = [];
  await identifyScanImage({
    checkBothOrientations: false,
    preferredOrientation: "rotated",
    search: async (orientation) => {
      searched.push(orientation);
      return candidate(orientation, result("card"));
    },
  });
  assert.deepEqual(searched, ["upright"]);
});

test("OCR skips the other orientation once the image decided the orientation", async () => {
  const reads: ScanOrientation[] = [];
  await identifyScanImage({
    checkBothOrientations: true,
    ocrEnabled: true,
    search: async (orientation) =>
      candidate(
        orientation,
        orientation === "upright" ? closeRunnerUp("card") : result(null),
      ),
    readText: async (image) => {
      reads.push(image.orientation);
      return { ...image, ocr: null };
    },
  });
  assert.deepEqual(reads, ["upright"]);
});

test("OCR still reads both orientations when neither image matched", async () => {
  const reads: ScanOrientation[] = [];
  await identifyScanImage({
    checkBothOrientations: true,
    ocrEnabled: true,
    search: async (orientation) =>
      candidate(orientation, result(null, 0.6, true)),
    readText: async (image) => {
      reads.push(image.orientation);
      return { ...image, ocr: null };
    },
  });
  assert.deepEqual(reads.sort(), ["rotated", "upright"]);
});

test("identify requests retry network and server errors, then succeed", async () => {
  const waits: number[] = [];
  let sends = 0;
  const value = await requestIdentifyWithRetries(
    async () => {
      sends++;
      if (sends === 1) throw new TypeError("Failed to fetch");
      if (sends === 2) throw Object.assign(new Error("down"), { status: 503 });
      return "matched";
    },
    { wait: async (delayMs) => void waits.push(delayMs) },
  );
  assert.equal(value, "matched");
  assert.deepEqual(waits, [...IDENTIFY_REQUEST_RETRY_DELAYS_MS]);
});

test("identify requests do not retry a rejected request", async () => {
  let sends = 0;
  await assert.rejects(
    requestIdentifyWithRetries(
      async () => {
        sends++;
        throw Object.assign(new Error("bad"), { status: 400 });
      },
      { wait: async () => assert.fail("Must not wait") },
    ),
    ScanIdentifyRequestError,
  );
  assert.equal(sends, 1);
});

test("identify requests stop after the bounded retries", async () => {
  let sends = 0;
  await assert.rejects(
    requestIdentifyWithRetries(
      async () => {
        sends++;
        throw new TypeError("Failed to fetch");
      },
      { wait: async () => undefined },
    ),
    ScanIdentifyRequestError,
  );
  assert.equal(sends, IDENTIFY_REQUEST_RETRY_DELAYS_MS.length + 1);
});

function squareContour(offset: number) {
  return {
    topLeft: { x: offset, y: offset },
    topRight: { x: offset + 100, y: offset },
    bottomRight: { x: offset + 100, y: offset + 100 },
    bottomLeft: { x: offset, y: offset + 100 },
  };
}

test("a card settles only after consecutive still detections", () => {
  const tracker = createCardSettleTracker();
  const still = { cardPresent: true, contour: squareContour(10) };
  assert.equal(tracker.observe(still, 1000), false);
  for (let tick = 1; tick < CARD_SETTLE_STABLE_TICKS; tick++) {
    assert.equal(tracker.observe(still, 1000), false);
  }
  assert.equal(tracker.observe(still, 1000), true);
});

test("movement or a missing card restarts the settle count", () => {
  const tracker = createCardSettleTracker(2);
  const first = { cardPresent: true, contour: squareContour(10) };
  const moved = { cardPresent: true, contour: squareContour(200) };
  tracker.observe(first, 1000);
  tracker.observe(first, 1000);
  assert.equal(tracker.observe(moved, 1000), false);
  assert.equal(tracker.observe(moved, 1000), false);
  assert.equal(
    tracker.observe({ cardPresent: false, contour: null }, 1000),
    false,
  );
  assert.equal(tracker.observe(moved, 1000), false);
  assert.equal(tracker.observe(moved, 1000), false);
  assert.equal(tracker.observe(moved, 1000), true);
});
