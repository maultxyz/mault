import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  closeGlobalSearch,
  openGlobalSearch,
  selectGlobalSearchGame,
  useGlobalSearchState,
} from "@/lib/global-search-store";

describe("global search store", () => {
  it("opens with an initial query and closes while keeping it", () => {
    const { result } = renderHook(() => useGlobalSearchState());
    expect(result.current.isOpen).toBe(false);

    act(() => openGlobalSearch("lightning bolt"));
    expect(result.current).toEqual({ isOpen: true, initialQuery: "lightning bolt", selectedGameKey: null });

    act(() => closeGlobalSearch());
    expect(result.current).toEqual({ isOpen: false, initialQuery: "lightning bolt", selectedGameKey: null });
  });

  it("opens with an empty query by default", () => {
    const { result } = renderHook(() => useGlobalSearchState());
    act(() => openGlobalSearch());
    expect(result.current).toEqual({ isOpen: true, initialQuery: "", selectedGameKey: null });
    act(() => closeGlobalSearch());
  });

  it("keeps the selected game between openings", () => {
    const { result } = renderHook(() => useGlobalSearchState());
    act(() => selectGlobalSearchGame("pokemon"));
    act(() => openGlobalSearch("pikachu"));
    expect(result.current.selectedGameKey).toBe("pokemon");
    act(() => closeGlobalSearch());
    act(() => openGlobalSearch());
    expect(result.current.selectedGameKey).toBe("pokemon");
    act(() => closeGlobalSearch());
    act(() => selectGlobalSearchGame(null));
  });
});
