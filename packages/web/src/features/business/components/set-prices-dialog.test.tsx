import { SetPricesDialog } from "@/features/business/components/set-prices-dialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const setCardCost = vi.fn((_request: unknown) => Promise.resolve({ success: true, data: { updated: 2 } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/features/business/api/business", () => ({
  setCardCost: (request: unknown) => setCardCost(request),
  setCardSellPrice: vi.fn(),
}));

vi.mock("@/features/business/api/use-business", () => ({
  useBusinessAccess: () => ({ settings: null }),
  useBusinessAction: () => (action: () => Promise<unknown>) => action(),
}));

vi.mock("@/hooks/use-price-source", () => ({
  usePriceSource: () => ({ format: (value: number) => `$${value.toFixed(2)}` }),
}));

vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("SetPricesDialog", () => {
  it("switches the cost tab to spreading a total and sends it", async () => {
    render(
      <SetPricesDialog
        scanIds={["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"]}
        open
        onOpenChange={() => {}}
        tabs={["sell", "cost"]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "setPrices.tabs.cost" }));
    fireEvent.click(screen.getByRole("button", { name: "setPrices.cost.modes.spread" }));
    expect(setCardCost).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("setPrices.cost.amountLabels.spread")).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText("setPrices.cost.amountLabels.spread"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "setPrices.cost.apply" }));
    await waitFor(() => {
      expect(setCardCost).toHaveBeenCalledWith({
        scanIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
        mode: "spread",
        amount: 30,
      });
    });
    expect(setCardCost).toHaveBeenCalledTimes(1);
  });

  it("keeps the sell tab working after switching tabs", async () => {
    render(
      <SetPricesDialog
        scanIds={["11111111-1111-4111-8111-111111111111"]}
        open
        onOpenChange={() => {}}
        tabs={["sell", "cost"]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "setPrices.tabs.cost" }));
    fireEvent.click(screen.getByRole("tab", { name: "setPrices.tabs.sell" }));
    fireEvent.click(screen.getByRole("button", { name: "setPrices.sell.modes.markup" }));
    await waitFor(() => {
      expect(screen.getByLabelText("setPrices.sell.markupLabel")).toBeTruthy();
    });
  });
});
