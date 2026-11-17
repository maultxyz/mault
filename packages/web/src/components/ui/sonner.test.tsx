import { Toaster } from "@/components/ui/sonner";
import { act, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { expect, it, vi } from "vitest";

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

it("keeps a toast open while keyboard focus is inside the toaster", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  render(<Toaster />);
  act(() => {
    toast("Removed 1 card", {
      duration: 300,
      action: { label: "Undo", onClick: () => {} },
    });
  });
  const undoButton = await screen.findByRole("button", { name: "Undo" });
  act(() => undoButton.focus());
  await act(() => wait(900));
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeNull();
  act(() => undoButton.blur());
  await waitFor(
    () => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull(),
    { timeout: 3000 },
  );
});
