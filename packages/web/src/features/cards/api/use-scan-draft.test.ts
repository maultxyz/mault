import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScanDraftOptions } from "@/lib/interfaces/cards";
import { useScanDraft } from "./use-scan-draft";

function renderScanDraft(initialProps: ScanDraftOptions) {
  return renderHook((props: ScanDraftOptions) => useScanDraft(props), {
    initialProps,
  });
}

describe("useScanDraft", () => {
  it("shows the next card's saved foil after saving a change and moving on", async () => {
    const setCardFoilType = vi.fn();
    const setCardCondition = vi.fn();
    const firstCard: ScanDraftOptions = {
      scanId: "scan-a",
      savedFoilType: null,
      savedCondition: "NM",
      savedLanguage: "en",
      setCardFoilType,
      setCardCondition,
      setCardLanguage: vi.fn(),
    };
    const { result, rerender } = renderScanDraft(firstCard);

    act(() => result.current.setFoilType("Foil"));
    await act(async () => result.current.save());
    expect(setCardFoilType).toHaveBeenCalledWith("scan-a", "Foil");

    rerender({ ...firstCard, scanId: "scan-b" });
    await waitFor(() => expect(result.current.foilType).toBeNull());

    act(() => result.current.setFoilType("Foil"));
    await act(async () => result.current.save());
    expect(setCardFoilType).toHaveBeenLastCalledWith("scan-b", "Foil");
  });

  it("drops an unsaved change when moving to another card", async () => {
    const options: ScanDraftOptions = {
      scanId: "scan-a",
      savedFoilType: null,
      savedCondition: "NM",
      savedLanguage: "en",
      setCardFoilType: vi.fn(),
      setCardCondition: vi.fn(),
      setCardLanguage: vi.fn(),
    };
    const { result, rerender } = renderScanDraft(options);

    act(() => result.current.setFoilType("Foil"));
    rerender({ ...options, scanId: "scan-b" });

    await waitFor(() => expect(result.current.foilType).toBeNull());
    expect(result.current.isDirty).toBe(false);
  });

  it("saves a change back to the saved value after an earlier save on the same card", async () => {
    const setCardFoilType = vi.fn();
    const { result } = renderScanDraft({
      scanId: "scan-a",
      savedFoilType: null,
      savedCondition: "NM",
      savedLanguage: "en",
      setCardFoilType,
      setCardCondition: vi.fn(),
      setCardLanguage: vi.fn(),
    });

    act(() => result.current.setFoilType("Foil"));
    await act(async () => result.current.save());
    act(() => result.current.setFoilType(null));
    await act(async () => result.current.save());

    expect(setCardFoilType).toHaveBeenLastCalledWith("scan-a", null);
  });

  it("saves only the language when only the language changed", async () => {
    const setCardFoilType = vi.fn();
    const setCardCondition = vi.fn();
    const setCardLanguage = vi.fn();
    const { result } = renderScanDraft({
      scanId: "scan-a",
      savedFoilType: null,
      savedCondition: "NM",
      savedLanguage: "en",
      setCardFoilType,
      setCardCondition,
      setCardLanguage,
    });

    act(() => result.current.setLanguage("ja"));
    await act(async () => result.current.save());

    expect(setCardLanguage).toHaveBeenCalledWith("scan-a", "ja");
    expect(setCardFoilType).not.toHaveBeenCalled();
    expect(setCardCondition).not.toHaveBeenCalled();
  });
});
