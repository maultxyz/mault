import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closeCardSearchMatches,
  createCardSettleTracker,
  identifyScanImage,
  type CardSearchResult,
  type OcrDiagnostics,
  type ScanOrientation,
} from "@magic-vault/shared";

function matches(
  distances: [string, number][],
  uncertain = false,
): CardSearchResult {
  return {
    success: true,
    message: "",
    nearestDistance: distances[0]?.[1] ?? 0.9,
    data: distances.map(([cardId, distance]) => ({
      cardId,
      distance,
      confidence: 0.9,
    })),
    ...(uncertain ? { diagnostics: { reason: "ambiguous" } } : {}),
  } as CardSearchResult;
}

function candidate(orientation: ScanOrientation, result: CardSearchResult) {
  return { orientation, result, embedding: [1] };
}

const closeAndConfident = matches([
  ["card", 0.2],
  ["card-reprint", 0.21],
]);
const closeButFar = matches([
  ["card", 0.4],
  ["card-reprint", 0.41],
]);

test("an unsure preferred match starts its text read while the other orientation is searched", async () => {
  const events: string[] = [];
  let textReads = 0;
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "upright",
    ocrMode: "when-unsure",
    search: async (orientation, reportImageResult) => {
      const result = orientation === "upright" ? closeButFar : matches([]);
      reportImageResult(result);
      if (orientation === "rotated") {
        events.push("rotated search started");
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        events.push("rotated search finished");
      }
      return candidate(orientation, result);
    },
    readText: async (image) => {
      textReads++;
      events.push(`${image.orientation} text started`);
      return {
        ...image,
        result: matches([["card-reprint", 0.41]]),
        ocr: { printingConfirmed: true } as OcrDiagnostics,
      };
    },
  });
  assert.deepEqual(events, [
    "rotated search started",
    "upright text started",
    "rotated search finished",
  ]);
  assert.equal(textReads, 1);
  assert.equal(outcome.matchedBy, "ocr");
  assert.equal(outcome.pick.result.data?.[0]?.cardId, "card-reprint");
});

test("a preferred orientation without a match waits for the other orientation before reading text", async () => {
  const reads: string[] = [];
  await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "upright",
    ocrMode: "when-unsure",
    search: async (orientation, reportImageResult) => {
      const result =
        orientation === "upright"
          ? matches([], true)
          : matches([["card", 0.2]]);
      reportImageResult(result);
      return candidate(orientation, result);
    },
    readText: async (image) => {
      reads.push(image.orientation);
      return { ...image, ocr: null };
    },
  });
  assert.deepEqual(reads, []);
});

test("a failed early text read falls back to the image match without an unhandled rejection", async () => {
  const outcome = await identifyScanImage({
    checkBothOrientations: true,
    preferredOrientation: "upright",
    ocrMode: "when-unsure",
    search: async (orientation, reportImageResult) => {
      const result =
        orientation === "upright" ? closeButFar : matches([["other", 0.1]]);
      reportImageResult(result);
      return candidate(orientation, result);
    },
    readText: async () => {
      throw Error("text search failed");
    },
  });
  assert.equal(outcome.pick.orientation, "rotated");
  assert.equal(outcome.matchedBy, "embedding");
});

test("an unsure image match is offered before its text read only when text is read on doubt", async () => {
  for (const ocrMode of ["when-unsure", "every-scan", "off"] as const) {
    const events: string[] = [];
    await identifyScanImage({
      checkBothOrientations: false,
      ocrMode,
      search: async (orientation) => candidate(orientation, closeAndConfident),
      readText: async (image) => {
        events.push("text");
        return { ...image, ocr: null };
      },
      onImageMatchBeforeText: (image) => {
        events.push(`offered ${image.result.data?.[0]?.cardId}`);
      },
    });
    assert.deepEqual(
      events,
      ocrMode === "when-unsure"
        ? ["offered card", "text"]
        : ocrMode === "every-scan"
          ? ["text"]
          : [],
    );
  }
});

test("a confident or unmatched image result is never offered before text", async () => {
  for (const result of [matches([["card", 0.2]]), matches([], true)]) {
    let offers = 0;
    await identifyScanImage({
      checkBothOrientations: false,
      ocrMode: "when-unsure",
      search: async (orientation) => candidate(orientation, result),
      readText: async (image) => ({ ...image, ocr: null }),
      onImageMatchBeforeText: () => {
        offers++;
      },
    });
    assert.equal(offers, 0);
  }
});

test("close matches are the leader and every match within the close delta", () => {
  assert.deepEqual(
    closeCardSearchMatches(
      matches([
        ["card", 0.2],
        ["card-reprint", 0.21],
        ["other", 0.4],
      ]),
    ).map((match) => match.cardId),
    ["card", "card-reprint"],
  );
  assert.deepEqual(closeCardSearchMatches(matches([])), []);
});

test("the settle tracker reports when the next still frame settles the card", () => {
  const tracker = createCardSettleTracker(2);
  const still = {
    cardPresent: true,
    contour: {
      topLeft: { x: 10, y: 10 },
      topRight: { x: 110, y: 10 },
      bottomRight: { x: 110, y: 110 },
      bottomLeft: { x: 10, y: 110 },
    },
  };
  assert.equal(tracker.settlesOnNextStillFrame(), false);
  tracker.observe(still, 1000);
  assert.equal(tracker.settlesOnNextStillFrame(), false);
  tracker.observe(still, 1000);
  assert.equal(tracker.settlesOnNextStillFrame(), true);
  assert.equal(tracker.observe(still, 1000), true);
  tracker.reset();
  assert.equal(tracker.settlesOnNextStillFrame(), false);
});
