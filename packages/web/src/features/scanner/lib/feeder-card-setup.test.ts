import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEEDER_CARD_DEFAULT_SETUP } from "@/lib/constants/scanner";
import { FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX } from "@/lib/constants/storage-keys";
import {
  feederCardRotationDegrees,
  loadFeederCardSetup,
  storeFeederCardSetup,
} from "./feeder-card-setup";

const scannerKey = "wia:fi-7160";

function inMemoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("feeder card setup storage", () => {
  beforeEach(() => vi.stubGlobal("localStorage", inMemoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the default setup when nothing is stored", () => {
    expect(loadFeederCardSetup(scannerKey)).toEqual(FEEDER_CARD_DEFAULT_SETUP);
  });

  it("round-trips a saved setup per scanner", () => {
    const setup = { sheetSide: "back", feedEdge: "long", cardTop: "upside-down" } as const;
    storeFeederCardSetup(scannerKey, setup);
    expect(loadFeederCardSetup(scannerKey)).toEqual(setup);
    expect(loadFeederCardSetup("wia:other")).toEqual(FEEDER_CARD_DEFAULT_SETUP);
  });

  it("ignores stored values that are not a valid setup", () => {
    localStorage.setItem(
      FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX + scannerKey,
      JSON.stringify({ sheetSide: "back", feedEdge: "long", cardTop: "sideways" }),
    );
    expect(loadFeederCardSetup(scannerKey)).toEqual(FEEDER_CARD_DEFAULT_SETUP);
    localStorage.setItem(FEEDER_CARD_SETUP_STORAGE_KEY_PREFIX + scannerKey, "{not json");
    expect(loadFeederCardSetup(scannerKey)).toEqual(FEEDER_CARD_DEFAULT_SETUP);
  });
});

describe("feederCardRotationDegrees", () => {
  it("keeps short-edge scans vertical", () => {
    expect(feederCardRotationDegrees({ feedEdge: "short", cardTop: "upright" })).toBe(0);
    expect(feederCardRotationDegrees({ feedEdge: "short", cardTop: "upside-down" })).toBe(180);
  });

  it("turns long-edge scans vertical", () => {
    expect(feederCardRotationDegrees({ feedEdge: "long", cardTop: "upright" })).toBe(90);
    expect(feederCardRotationDegrees({ feedEdge: "long", cardTop: "upside-down" })).toBe(270);
  });
});
