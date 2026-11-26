import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeScannerControlCode,
  findScannerControlCommandProblem,
  isScannerControlCode,
  listScannerControlActions,
  parseScannerControlCode,
  resolveControlCardBinNumber,
  type BinConfig,
  type Game,
  type ScannerControlCommand,
  type ScannerControlTargets,
} from "@magic-vault/shared";

function makeGame(guid: string): Game {
  return { guid } as Game;
}

const targets: ScannerControlTargets = {
  collections: [
    { guid: "collection-mtg", game: makeGame("mtg") },
    { guid: "collection-pokemon", game: makeGame("pokemon") },
  ],
  presets: [
    { guid: "preset-mtg", game: makeGame("mtg") },
    { guid: "preset-pokemon", game: makeGame("pokemon") },
  ],
  activeCollectionGuid: "collection-mtg",
};

test("every field survives an encode and parse round trip", () => {
  const command: ScannerControlCommand = {
    collectionGuid: "collection-mtg",
    presetGuid: "preset-mtg",
    forcedFoilType: "Etched & Galaxy",
    forcedSetCode: "neo",
    condition: "LP",
    pauseScanner: true,
    autoFeed: false,
    allowDuplicates: true,
    endBatch: true,
  };
  const encoded = encodeScannerControlCode(command);
  assert.ok(isScannerControlCode(encoded));
  assert.deepEqual(parseScannerControlCode(encoded), command);
});

test("empty foil and set values clear the forced options", () => {
  const encoded = encodeScannerControlCode({ forcedFoilType: null, forcedSetCode: null });
  assert.deepEqual(parseScannerControlCode(encoded), {
    forcedFoilType: null,
    forcedSetCode: null,
  });
});

test("other QR codes are not control codes", () => {
  assert.equal(isScannerControlCode("https://example.com/redeem?code=ABC"), false);
  assert.equal(parseScannerControlCode("https://example.com/redeem?code=ABC"), null);
});

test("malformed or unsupported control codes are rejected", () => {
  assert.equal(parseScannerControlCode("mault-control:1?condition=MINT"), null);
  assert.equal(parseScannerControlCode("mault-control:1?autoFeed=yes"), null);
  assert.equal(parseScannerControlCode("mault-control:1?unknownField=1"), null);
  assert.equal(parseScannerControlCode("mault-control:1?"), null);
  assert.equal(parseScannerControlCode("mault-control:3?condition=NM"), null);
  assert.equal(isScannerControlCode("mault-control:3?condition=NM"), true);
});

test("cards without new fields keep the version older apps read", () => {
  assert.equal(encodeScannerControlCode({ condition: "NM" }), "mault-control:1?condition=NM");
  assert.equal(encodeScannerControlCode({ endBatch: true }), "mault-control:2?batch=1");
  assert.deepEqual(parseScannerControlCode("mault-control:2?condition=NM"), { condition: "NM" });
  assert.equal(parseScannerControlCode("mault-control:1?batch=1"), null);
});

test("a batch separator goes to the last scanned card's bin, else the catch-all", () => {
  const configs = [
    { binNumber: 1, isCatchAll: true },
    { binNumber: 2 },
    { binNumber: 3, isDisabled: true },
  ] as BinConfig[];
  assert.equal(resolveControlCardBinNumber(configs, { endBatch: true }, 2), 2);
  assert.equal(resolveControlCardBinNumber(configs, { endBatch: true }, null), 1);
  assert.equal(resolveControlCardBinNumber(configs, { endBatch: true }, 3), 1);
  assert.equal(resolveControlCardBinNumber(configs, { endBatch: true }, 9), 1);
  assert.equal(resolveControlCardBinNumber(configs, { condition: "NM" }, 2), 1);
  assert.equal(resolveControlCardBinNumber(configs, null, 2), 1);
});

test("presets must exist and match the target collection's game", () => {
  assert.equal(findScannerControlCommandProblem({ presetGuid: "preset-mtg" }, targets), null);
  assert.equal(
    findScannerControlCommandProblem({ presetGuid: "preset-pokemon" }, targets),
    "preset-wrong-game",
  );
  assert.equal(
    findScannerControlCommandProblem(
      { collectionGuid: "collection-pokemon", presetGuid: "preset-pokemon" },
      targets,
    ),
    null,
  );
  assert.equal(
    findScannerControlCommandProblem({ presetGuid: "missing" }, targets),
    "preset-not-found",
  );
  assert.equal(
    findScannerControlCommandProblem(
      { presetGuid: "preset-mtg" },
      { ...targets, activeCollectionGuid: null },
    ),
    "no-collection",
  );
});

test("unknown collections are reported", () => {
  assert.equal(
    findScannerControlCommandProblem({ collectionGuid: "deleted" }, targets),
    "collection-not-found",
  );
});

test("actions list every change in a stable order with resolved names", () => {
  const actions = listScannerControlActions(
    {
      collectionGuid: "collection-mtg",
      forcedFoilType: null,
      condition: "MP",
      autoFeed: true,
      pauseScanner: true,
    },
    {
      collectionName: (guid) => `name:${guid}`,
      presetName: (guid) => guid,
      setName: (code) => code,
      conditionName: (condition) => `label:${condition}`,
    },
  );
  assert.deepEqual(actions, [
    { key: "collection", values: { name: "name:collection-mtg" } },
    { key: "notFoil", values: {} },
    { key: "condition", values: { condition: "label:MP" } },
    { key: "autoFeedOn", values: {} },
    { key: "pause", values: {} },
  ]);
});
