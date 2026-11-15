import { describe, expect, it, vi } from "vitest";
import type { RouteCardToBinParams } from "@/lib/interfaces/scanner";
import { routeCardToBin } from "./route-card-to-bin";

vi.mock("@/features/notifications/api/notification-settings", () => ({
  reportSerialEvent: vi.fn(),
}));

function routeParams(
  response: unknown,
  overrides: Partial<RouteCardToBinParams> = {},
): RouteCardToBinParams {
  return {
    route: { binNumber: 3, module: 2, direction: "left" },
    sendRoute: vi.fn().mockResolvedValue(response),
    toast: { error: vi.fn(), success: vi.fn() } as unknown as RouteCardToBinParams["toast"],
    t: ((key: string) => key) as RouteCardToBinParams["t"],
    failedKey: "scannedCards.routingFailed",
    collectionGuid: "collection",
    isAutoFeedEnabled: () => true,
    isPipelinedFeedEnabled: () => false,
    pause: vi.fn(),
    triggerAutoFeedAfterRoutedCard: vi.fn().mockResolvedValue(undefined),
    onJam: vi.fn(),
    ...overrides,
  };
}

describe("routeCardToBin", () => {
  it("feeds the next card through the module 1 check after a routed card", async () => {
    const params = routeParams({ status: "routed" });
    await routeCardToBin(params);
    expect(params.triggerAutoFeedAfterRoutedCard).toHaveBeenCalledTimes(1);
    expect(params.pause).not.toHaveBeenCalled();
  });

  it("leaves the feed to firmware when the route already fed the next card", async () => {
    const params = routeParams({ status: "routed", fedNext: true });
    await routeCardToBin(params);
    expect(params.triggerAutoFeedAfterRoutedCard).not.toHaveBeenCalled();
  });

  it("does not feed after a failed route", async () => {
    const params = routeParams({ error: "timeout: no card detected at module 2" });
    await routeCardToBin(params);
    expect(params.triggerAutoFeedAfterRoutedCard).not.toHaveBeenCalled();
    expect(params.pause).toHaveBeenCalledTimes(1);
  });
});
