import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PERSISTED_SCAN_SETTINGS,
  hasNonDefaultScanSettings,
  parsePersistedScanSettings,
  scanSettingsForGame,
  serializePersistedScanSettings,
  type PersistedScanSettings,
} from "@magic-vault/shared";

const mtgSettings: PersistedScanSettings = {
  foilType: "Etched",
  preferredSetCodes: ["mh3"],
  condition: "LP",
  gameKey: "mtg",
};

test("stored settings round-trip and defaults are not stored", () => {
  const serialized = serializePersistedScanSettings(mtgSettings);
  assert.ok(serialized);
  assert.deepEqual(parsePersistedScanSettings(serialized), mtgSettings);
  assert.equal(serializePersistedScanSettings(DEFAULT_PERSISTED_SCAN_SETTINGS), null);
});

test("unreadable or invalid stored values fall back to defaults", () => {
  assert.deepEqual(parsePersistedScanSettings("not json"), DEFAULT_PERSISTED_SCAN_SETTINGS);
  assert.deepEqual(
    parsePersistedScanSettings(JSON.stringify({ condition: "Mint", preferredSetCodes: [1, "", "lea"], foilType: "" })),
    { ...DEFAULT_PERSISTED_SCAN_SETTINGS, preferredSetCodes: ["lea"] },
  );
});

test("settings stay when the next collection is the same game", () => {
  assert.equal(scanSettingsForGame(mtgSettings, { key: "mtg", foilTypes: ["Foil", "Etched"] }), mtgSettings);
});

test("another game drops sets and a foil type it does not have", () => {
  assert.deepEqual(scanSettingsForGame(mtgSettings, { key: "pokemon", foilTypes: ["Holo", "Reverse Holo"] }), {
    foilType: null,
    preferredSetCodes: [],
    condition: "LP",
    gameKey: "pokemon",
  });
  assert.equal(
    scanSettingsForGame(mtgSettings, { key: "lorcana", foilTypes: [] }).foilType,
    "Etched",
  );
});

test("settings saved before a game was known adopt the first game", () => {
  const stored = { ...mtgSettings, gameKey: null };
  assert.deepEqual(scanSettingsForGame(stored, { key: "mtg", foilTypes: [] }), mtgSettings);
});

test("only foil, sets and a non-default condition count as still set", () => {
  assert.equal(hasNonDefaultScanSettings({ ...DEFAULT_PERSISTED_SCAN_SETTINGS, gameKey: "mtg" }), false);
  assert.equal(hasNonDefaultScanSettings({ ...DEFAULT_PERSISTED_SCAN_SETTINGS, condition: "HP" }), true);
});
