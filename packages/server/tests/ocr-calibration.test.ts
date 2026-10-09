import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calibrateField,
  proposeRegions,
} from "../src/lib/ocr-calibration/cluster";
import { observeCard } from "../src/lib/ocr-calibration/match";
import type {
  OcrFieldObservation,
  OcrPageLine,
} from "../src/lib/interfaces/ocr-calibration";

function line(words: [string, number, number, number, number][]): OcrPageLine {
  const boxes = words.map(([text, x0, y0, x1, y1]) => ({
    text,
    box: { x0, y0, x1, y1 },
  }));
  return {
    words: boxes,
    box: {
      x0: Math.min(...boxes.map(({ box }) => box.x0)),
      y0: Math.min(...boxes.map(({ box }) => box.y0)),
      x1: Math.max(...boxes.map(({ box }) => box.x1)),
      y1: Math.max(...boxes.map(({ box }) => box.y1)),
    },
  };
}

test("observeCard finds a name with an OCR typo, the number and the set line", () => {
  const lines = [
    line([
      ["Llanowar", 0.08, 0.05, 0.25, 0.09],
      ["E1ves", 0.26, 0.05, 0.36, 0.09],
    ]),
    line([
      ["Add", 0.1, 0.6, 0.15, 0.63],
      ["{G}.", 0.16, 0.6, 0.2, 0.63],
    ]),
    line([
      ["0123/280", 0.03, 0.93, 0.15, 0.945],
      ["C", 0.16, 0.93, 0.18, 0.945],
    ]),
    line([
      ["DOM", 0.03, 0.95, 0.09, 0.965],
      ["EN", 0.1, 0.95, 0.13, 0.965],
    ]),
  ];
  const observed = observeCard(lines, {
    name: "Llanowar Elves",
    setCode: "dom",
    collectorNumber: "123",
  });
  assert.deepEqual(observed.name, {
    box: { x0: 0.08, y0: 0.05, x1: 0.36, y1: 0.09 },
    lineCount: 1,
  });
  assert.deepEqual(observed.number?.box, {
    x0: 0.03,
    y0: 0.93,
    x1: 0.15,
    y1: 0.945,
  });
  assert.deepEqual(observed.setLine, {
    box: { x0: 0.03, y0: 0.93, x1: 0.18, y1: 0.965 },
    lineCount: 2,
  });
});

test("observeCard joins a subtitle printed on the next line", () => {
  const lines = [
    line([
      ["Darth", 0.3, 0.07, 0.42, 0.1],
      ["Vader", 0.43, 0.07, 0.55, 0.1],
    ]),
    line([
      ["Dark", 0.25, 0.11, 0.33, 0.135],
      ["Lord", 0.34, 0.11, 0.42, 0.135],
      ["of", 0.43, 0.11, 0.46, 0.135],
      ["the", 0.47, 0.11, 0.52, 0.135],
      ["Sith", 0.53, 0.11, 0.6, 0.135],
    ]),
  ];
  const observed = observeCard(lines, {
    name: "Darth Vader - Dark Lord of the Sith",
    setCode: "sor",
    collectorNumber: "10",
  });
  assert.equal(observed.name?.lineCount, 2);
  assert.deepEqual(observed.name?.box, {
    x0: 0.25,
    y0: 0.07,
    x1: 0.6,
    y1: 0.135,
  });
});

test("observeCard skips an ambiguous collector number", () => {
  const lines = [
    line([["12", 0.1, 0.5, 0.13, 0.52]]),
    line([["12", 0.8, 0.9, 0.83, 0.92]]),
  ];
  const observed = observeCard(lines, {
    name: "Nothing Here",
    setCode: "xyz",
    collectorNumber: "12",
  });
  assert.equal(observed.number, undefined);
});

test("calibrateField keeps separate frame layouts and drops noise", () => {
  const observation = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    lineCount = 1,
  ): OcrFieldObservation => ({ box: { x0, y0, x1, y1 }, lineCount });
  const top = Array.from({ length: 8 }, (_, i) =>
    observation(0.07, 0.05, 0.3 + i * 0.04, 0.09),
  );
  const bottom = Array.from({ length: 3 }, () =>
    observation(0.1, 0.8, 0.6, 0.86, 2),
  );
  const result = calibrateField("name", [
    ...top,
    ...bottom,
    observation(0.5, 0.4, 0.6, 0.42),
  ]);
  assert.equal(result.found, 12);
  assert.equal(result.clusters.length, 2);
  assert.deepEqual(result.clusters[0].region, {
    field: "name",
    x: 0.07,
    y: 0.05,
    width: 0.51,
    height: 0.04,
  });
  assert.equal(result.clusters[0].support, 8);
  assert.equal(result.clusters[1].region.multiline, true);
  assert.deepEqual(result.combined, {
    field: "name",
    x: 0.07,
    y: 0.05,
    width: 0.53,
    height: 0.81,
    multiline: true,
  });
});

test("observeCard prefers the large printed name over a mention in rules text", () => {
  const lines = [
    line([
      ["Bear", 0.07, 0.05, 0.16, 0.085],
      ["Cub", 0.17, 0.05, 0.24, 0.085],
    ]),
    line([
      ["When", 0.1, 0.7, 0.16, 0.718],
      ["Bear", 0.17, 0.7, 0.22, 0.718],
      ["Cub", 0.23, 0.7, 0.27, 0.718],
      ["attacks", 0.28, 0.7, 0.36, 0.718],
    ]),
  ];
  const observed = observeCard(lines, {
    name: "Bear Cub",
    setCode: "fdn",
    collectorNumber: "552",
  });
  assert.equal(observed.name?.box.y0, 0.05);
});

test("proposeRegions marks other layouts as fallbacks", () => {
  const calibration = {
    field: "number" as const,
    found: 10,
    clusters: [
      {
        region: { field: "number" as const, x: 0.06, y: 0.93, width: 0.11, height: 0.02 },
        support: 8,
        share: 0.8,
      },
      {
        region: { field: "number" as const, x: 0.65, y: 0.93, width: 0.11, height: 0.02 },
        support: 2,
        share: 0.2,
      },
    ],
    combined: { field: "number" as const, x: 0.06, y: 0.93, width: 0.7, height: 0.02, multiline: true },
  };
  assert.deepEqual(proposeRegions(calibration), [
    calibration.clusters[0].region,
    { ...calibration.clusters[1].region, fallback: true },
  ]);
});

test("proposeRegions uses the combined region when no layout covers half the cards", () => {
  const region = (y: number) => ({ field: "name" as const, x: 0.1, y, width: 0.6, height: 0.04 });
  const combined = { field: "name" as const, x: 0.1, y: 0.67, width: 0.6, height: 0.17, multiline: true };
  assert.deepEqual(
    proposeRegions({
      field: "name",
      found: 20,
      clusters: [
        { region: region(0.76), support: 8, share: 0.4 },
        { region: region(0.8), support: 6, share: 0.3 },
        { region: region(0.67), support: 6, share: 0.3 },
      ],
      combined,
    }),
    [combined],
  );
});
