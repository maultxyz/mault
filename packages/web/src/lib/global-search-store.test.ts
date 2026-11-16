import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { closeGlobalSearch, openGlobalSearch, useGlobalSearchState } from "@/lib/global-search-store";

describe("global search store", () => {
  it("opens with an initial query and closes while keeping it", () => {
    const { result } = renderHook(() => useGlobalSearchState());
    expect(result.current.isOpen).toBe(false);

    act(() => openGlobalSearch("lightning bolt"));
    expect(result.current).toEqual({ isOpen: true, initialQuery: "lightning bolt" });

    act(() => closeGlobalSearch());
    expect(result.current).toEqual({ isOpen: false, initialQuery: "lightning bolt" });
  });

  it("opens with an empty query by default", () => {
    const { result } = renderHook(() => useGlobalSearchState());
    act(() => openGlobalSearch());
    expect(result.current).toEqual({ isOpen: true, initialQuery: "" });
    act(() => closeGlobalSearch());
  });
});
