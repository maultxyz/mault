import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";
import { useShiftClick } from "@/hooks/use-shift-click";

// Mirrors how ScannedCardItem / ScannedCardTable / CollectionTile wire the
// hook: Base UI fires onCheckedChange from the hidden input's change event,
// which has no shiftKey, so shift has to be captured on mousedown.
function SelectBox({ onToggle }: { onToggle: (shiftKey: boolean) => void }) {
  const { onMouseDown, consumeShift } = useShiftClick();
  return (
    <span onMouseDown={onMouseDown}>
      <Checkbox
        aria-label="select card"
        onCheckedChange={() => onToggle(consumeShift())}
      />
    </span>
  );
}

describe("useShiftClick", () => {
  it("reports shiftKey true on a shift-click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<SelectBox onToggle={onToggle} />);

    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("checkbox", { name: "select card" }));
    await user.keyboard("{/Shift}");

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("reports shiftKey false on a plain click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<SelectBox onToggle={onToggle} />);

    await user.click(screen.getByRole("checkbox", { name: "select card" }));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("does not leak shift into the next plain click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<SelectBox onToggle={onToggle} />);
    const box = screen.getByRole("checkbox", { name: "select card" });

    await user.keyboard("{Shift>}");
    await user.click(box);
    await user.keyboard("{/Shift}");
    await user.click(box);

    expect(onToggle.mock.calls).toEqual([[true], [false]]);
  });
});
