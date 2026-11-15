import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoFeedSerial } from "@/lib/interfaces/scanner";
import { useAutoFeed } from "./use-auto-feed";

const mocks = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("./use-serial", () => ({ useSerialMessage: () => {} }));
vi.mock("./use-station-toast", () => ({
  useStationToast: () => ({ error: mocks.error, success: mocks.success }),
}));
vi.mock("@/features/notifications/api/notification-settings", () => ({
  reportSerialEvent: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderAutoFeed(moduleOneLoaded: boolean) {
  const sentCommands: object[] = [];
  const serial: AutoFeedSerial = {
    ignoreIrSensors: false,
    sendRequest: vi.fn(async (command: object) => {
      sentCommands.push(command);
      if ("readIR" in command) {
        return {
          sent: true,
          line: JSON.stringify({ status: "ok", ir: [moduleOneLoaded, false] }),
        };
      }
      return {
        sent: true,
        line: JSON.stringify({ status: "ok", detected: true, empty: false }),
      };
    }),
  };
  const rendered = renderHook(() =>
    useAutoFeed({
      serialRef: { current: serial },
      activeCollectionRef: { current: null },
      deviceGuidRef: { current: undefined },
      feedRetryCountRef: { current: 0 },
    }),
  );
  const cardArrived = vi.fn();
  act(() => {
    rendered.result.current.registerCardArrivedHook(cardArrived);
  });
  return { ...rendered, sentCommands, cardArrived };
}

afterEach(() => {
  cleanup();
  mocks.error.mockClear();
});

describe("useAutoFeed after a routed card", () => {
  it("pauses instead of feeding when the routed card is still in module 1", async () => {
    const { result, sentCommands, cardArrived } = renderAutoFeed(true);
    await act(() => result.current.triggerAutoFeedAfterRoutedCard());
    expect(sentCommands).toEqual([{ readIR: true }]);
    expect(cardArrived).not.toHaveBeenCalled();
    expect(result.current.isFeedHalted()).toBe(true);
    expect(result.current.attention?.kind).toBe("cardStuckInModuleOne");
    expect(mocks.error).toHaveBeenCalledWith(
      "cardScanner.cardStuckInModuleOne.title",
      expect.anything(),
    );
  });

  it("feeds the next card once module 1 reads clear", async () => {
    const { result, sentCommands, cardArrived } = renderAutoFeed(false);
    await act(() => result.current.triggerAutoFeedAfterRoutedCard());
    expect(sentCommands).toEqual([{ readIR: true }, { feeder: true }]);
    expect(cardArrived).toHaveBeenCalledTimes(1);
    expect(result.current.attention).toBeNull();
  });

  it("resuming feeds without checking module 1 again", async () => {
    const { result, sentCommands, cardArrived } = renderAutoFeed(true);
    await act(() => result.current.triggerAutoFeedAfterRoutedCard());
    act(() => result.current.resume());
    await act(() => result.current.triggerAutoFeed());
    expect(sentCommands).toEqual([{ readIR: true }, { feeder: true }]);
    expect(cardArrived).toHaveBeenCalledTimes(1);
  });
});
