import { describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";

function mouseEvent(overrides: Partial<MouseEvent>): MouseEvent {
  return {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...overrides,
  } as unknown as MouseEvent;
}

describe("modifierClickSelectHandlers", () => {
  it("toggles selection and stops the click on ctrl or cmd click", () => {
    const onToggleSelect = vi.fn();
    const { onClickCapture } = modifierClickSelectHandlers(onToggleSelect);
    const ctrlClick = mouseEvent({ ctrlKey: true });
    onClickCapture?.(ctrlClick);
    onClickCapture?.(mouseEvent({ metaKey: true, shiftKey: true }));
    expect(onToggleSelect.mock.calls).toEqual([[false], [true]]);
    expect(ctrlClick.preventDefault).toHaveBeenCalled();
    expect(ctrlClick.stopPropagation).toHaveBeenCalled();
  });

  it("leaves plain clicks and right clicks alone", () => {
    const onToggleSelect = vi.fn();
    const { onClickCapture, onContextMenu } =
      modifierClickSelectHandlers(onToggleSelect);
    const plainClick = mouseEvent({});
    onClickCapture?.(plainClick);
    onContextMenu?.(mouseEvent({ button: 2, ctrlKey: true }));
    expect(onToggleSelect).not.toHaveBeenCalled();
    expect(plainClick.stopPropagation).not.toHaveBeenCalled();
  });

  it("selects on the macOS ctrl click context menu", () => {
    const onToggleSelect = vi.fn();
    const { onContextMenu } = modifierClickSelectHandlers(onToggleSelect);
    onContextMenu?.(mouseEvent({ ctrlKey: true }));
    expect(onToggleSelect).toHaveBeenCalledWith(false);
  });

  it("adds no handlers when the item can't be selected", () => {
    expect(modifierClickSelectHandlers(undefined)).toEqual({});
  });
});
