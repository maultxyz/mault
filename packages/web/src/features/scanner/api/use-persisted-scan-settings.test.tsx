import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Collection } from "@magic-vault/shared";
import { usePersistedScanSettings } from "./use-persisted-scan-settings";

const mocks = vi.hoisted(() => ({
  toast: { info: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({ activeOrg: { id: "org" } }),
}));
vi.mock("./use-station-toast", () => ({ useStationToast: () => mocks.toast }));

function collection(guid: string, gameKey: string): Collection {
  return { guid, game: { key: gameKey, foilTypes: [] } } as unknown as Collection;
}

function renderSettings(initialCollection: Collection) {
  const resetScanSettingsRef = { current: vi.fn() };
  return renderHook(
    ({ activeCollection }) =>
      usePersistedScanSettings(activeCollection, resetScanSettingsRef),
    { initialProps: { activeCollection: initialCollection } },
  );
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  mocks.toast.info.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("restores foil, condition and sets after a reload", () => {
  const first = renderSettings(collection("a", "mtg"));
  act(() => {
    first.result.current.setFoilType("Foil");
    first.result.current.setCondition("LP");
    first.result.current.setPreferredSetCodes(["mh3"]);
  });
  first.unmount();

  const reloaded = renderSettings(collection("a", "mtg"));
  expect(reloaded.result.current.settings).toMatchObject({
    foilType: "Foil",
    condition: "LP",
    preferredSetCodes: ["mh3"],
  });
});

it("keeps settings on a switch within the same game and says so", () => {
  const { result, rerender } = renderSettings(collection("a", "mtg"));
  act(() => result.current.setCondition("HP"));
  rerender({ activeCollection: collection("b", "mtg") });
  expect(result.current.settings.condition).toBe("HP");
  expect(mocks.toast.info).toHaveBeenCalledWith(
    "retainedScanSettings.title",
    expect.objectContaining({ description: "retainedScanSettings.condition" }),
  );
});

it("drops sets when switching to another game", () => {
  const { result, rerender } = renderSettings(collection("a", "mtg"));
  act(() => result.current.setPreferredSetCodes(["mh3"]));
  rerender({ activeCollection: collection("b", "pokemon") });
  expect(result.current.settings.preferredSetCodes).toEqual([]);
  expect(mocks.toast.info).not.toHaveBeenCalled();
});

it("says nothing on a switch when every setting is at its default", () => {
  const { rerender } = renderSettings(collection("a", "mtg"));
  rerender({ activeCollection: collection("b", "mtg") });
  expect(mocks.toast.info).not.toHaveBeenCalled();
});
