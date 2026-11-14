import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSampleCard } from "@/features/games/api/games";
import { SampleCardBrowser } from "@/features/games/components/sample-card-browser";

vi.mock("@/features/games/api/games", () => ({ getSampleCard: vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("sample card search", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    { name: "an HTTP error", error: new Error("API error: 404") },
    { name: "a network error", error: new TypeError("Failed to fetch") },
  ])("clears loading after $name and allows retry", async ({ error }) => {
    vi.mocked(getSampleCard).mockRejectedValueOnce(error);
    render(<SampleCardBrowser gameKey="mtg" onPick={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "fieldMapping.search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("fieldMapping.loadError");
    expect(screen.getByRole("button", { name: "fieldMapping.search" })).toBeEnabled();

    vi.mocked(getSampleCard).mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { name: "Forest", raw: { name: "Forest" } },
    });
    fireEvent.change(input, { target: { value: "Forest" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await screen.findByText('"Forest"');
    expect(getSampleCard).toHaveBeenNthCalledWith(2, "mtg", "Forest");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "fieldMapping.search" })).toBeEnabled();
  });

  it("preserves the API error message for unsuccessful results and clears loading", async () => {
    vi.mocked(getSampleCard).mockResolvedValueOnce({
      success: false,
      message: "No synced card matches that name.",
    });
    render(<SampleCardBrowser gameKey="mtg" onPick={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "fieldMapping.search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No synced card matches that name.");
    expect(screen.getByRole("button", { name: "fieldMapping.search" })).toBeEnabled();
  });

  it("shows the existing error and clears loading when raw sample data is invalid", async () => {
    vi.mocked(getSampleCard).mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { name: "Forest", raw: null },
    });
    render(<SampleCardBrowser gameKey="mtg" onPick={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Forest" } });
    fireEvent.click(screen.getByRole("button", { name: "fieldMapping.search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("fieldMapping.loadError");
    expect(screen.getByRole("button", { name: "fieldMapping.search" })).toBeEnabled();
  });
});
