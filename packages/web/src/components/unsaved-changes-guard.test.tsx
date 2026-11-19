import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";

const blocker = vi.hoisted(() => ({ state: "blocked", proceed: vi.fn(), reset: vi.fn() }));
vi.mock("@/hooks/use-unsaved-changes-guard", () => ({ useUnsavedChangesGuard: () => blocker }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, onClick }: React.ComponentProps<"button">) => <button onClick={onClick}>{children}</button> }));
vi.mock("@/components/ui/dialog", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { Dialog: Container, DialogContent: Container, DialogDescription: Container,
    DialogFooter: Container, DialogHeader: Container, DialogTitle: Container };
});
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("waits for live preview restoration before navigating away", async () => {
  let restore: () => void = () => {};
  const pending = new Promise<void>((resolve) => { restore = resolve; });
  render(<UnsavedChangesGuard isDirty onDiscard={() => pending} />);
  fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.discardAndLeave" }));
  expect(blocker.proceed).not.toHaveBeenCalled();
  restore();
  await waitFor(() => expect(blocker.proceed).toHaveBeenCalledTimes(1));
});

it("keeps the page open if restoring the saved settings fails", async () => {
  const discard = vi.fn().mockRejectedValue(new Error("Camera disconnected"));
  render(<UnsavedChangesGuard isDirty onDiscard={discard} />);
  fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.discardAndLeave" }));
  await waitFor(() => expect(discard).toHaveBeenCalledTimes(1));
  expect(blocker.proceed).not.toHaveBeenCalled();
});
