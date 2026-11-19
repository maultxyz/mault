import { describe, expect, it } from "vitest";
import {
  isCharacterKeyHotkey,
  isHotkeyActive,
  withoutCharacterKeyHotkeys,
} from "@/lib/hotkeys";
import type { HotkeyHandlers } from "@/lib/interfaces/hotkeys";

describe("isCharacterKeyHotkey", () => {
  it("treats letters, digits, punctuation and space as character keys", () => {
    expect(isCharacterKeyHotkey("scanNow")).toBe(true);
    expect(isCharacterKeyHotkey("cardConditionNM")).toBe(true);
    expect(isCharacterKeyHotkey("showShortcuts")).toBe(true);
    expect(isCharacterKeyHotkey("focusSearch")).toBe(true);
    expect(isCharacterKeyHotkey("scanPauseResume")).toBe(true);
  });

  it("treats shift combinations and letter sequences as character keys", () => {
    expect(isCharacterKeyHotkey("scanEmergencyStop")).toBe(true);
    expect(isCharacterKeyHotkey("goScanner")).toBe(true);
    expect(isCharacterKeyHotkey("goSettings")).toBe(true);
  });

  it("keeps modifier combinations and named keys", () => {
    expect(isCharacterKeyHotkey("save")).toBe(false);
    expect(isCharacterKeyHotkey("cardClose")).toBe(false);
    expect(isCharacterKeyHotkey("cardPrevious")).toBe(false);
    expect(isCharacterKeyHotkey("reviewNextMatch")).toBe(false);
    expect(isCharacterKeyHotkey("reviewAccept")).toBe(false);
    expect(isCharacterKeyHotkey("cardRemove")).toBe(false);
  });
});

describe("isHotkeyActive", () => {
  it("keeps every hotkey active while single-key shortcuts are on", () => {
    expect(isHotkeyActive("scanNow", true)).toBe(true);
    expect(isHotkeyActive("goScanner", true)).toBe(true);
    expect(isHotkeyActive("save", true)).toBe(true);
  });

  it("deactivates only character key hotkeys while single-key shortcuts are off", () => {
    expect(isHotkeyActive("scanNow", false)).toBe(false);
    expect(isHotkeyActive("focusSearch", false)).toBe(false);
    expect(isHotkeyActive("goScanner", false)).toBe(false);
    expect(isHotkeyActive("save", false)).toBe(true);
    expect(isHotkeyActive("clearSelection", false)).toBe(true);
    expect(isHotkeyActive("cardNext", false)).toBe(true);
  });
});

describe("withoutCharacterKeyHotkeys", () => {
  it("drops only the character key handlers", () => {
    const handler = () => {};
    const handlers: HotkeyHandlers = {
      showShortcuts: handler,
      goCollections: handler,
      scanCycleFoil: handler,
      save: handler,
      clearSelection: handler,
      cardNext: handler,
    };
    expect(Object.keys(withoutCharacterKeyHotkeys(handlers)).sort()).toEqual([
      "cardNext",
      "clearSelection",
      "save",
    ]);
  });
});
