import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutoFeedSerial } from "@/lib/interfaces/scanner";
import { useAutoFeed } from "./use-auto-feed";

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("./use-serial", () => ({ useSerialMessage: () => {} }));
vi.mock("./use-station-toast", () => ({
  useStationToast: () => ({
    error: mocks.error,
    success: mocks.success,
    warning: mocks.warning,
  }),
}));
vi.mock("@/features/notifications/api/notification-settings", () => ({
  reportSerialEvent: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderAutoFeed(moduleOneLoaded: boolean, supportsEmergencyStop = true) {
  const sentCommands: object[] = [];
  const serial: AutoFeedSerial = {
    ignoreIrSensors: false,
    supportsEmergencyStop,
    sendEmergencyStop: vi.fn(async () => {
      sentCommands.push({ stop: true });
      return true;
    }),
    sendNeutral: vi.fn(async () => {
      sentCommands.push({ neutral: true });
      return true;
    }),
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
  mocks.warning.mockClear();
});

describe("useAutoFeed emergency stop", () => {
  it("stops the sorter and stays stopped until reset", async () => {
    const { result, sentCommands } = renderAutoFeed(false);
    await act(() => result.current.emergencyStop());
    expect(sentCommands).toEqual([{ stop: true }]);
    expect(result.current.isFeedHalted()).toBe(true);
    expect(result.current.attention?.kind).toBe("emergencyStopped");
    act(() => {
      result.current.resume();
      result.current.clearFeedHalt();
      result.current.pauseForAttention({ kind: "routingFailed" });
    });
    expect(result.current.isFeedHalted()).toBe(true);
    expect(result.current.attention?.kind).toBe("emergencyStopped");
    await act(async () => {
      expect(await result.current.resetAfterEmergencyStop()).toBe(true);
    });
    expect(sentCommands).toEqual([{ stop: true }, { neutral: true }]);
    expect(result.current.attention).toBeNull();
    expect(result.current.isFeedHalted()).toBe(true);
  });

  it("warns that older firmware finishes the current card", async () => {
    const { result, sentCommands } = renderAutoFeed(false, false);
    await act(() => result.current.emergencyStop());
    expect(sentCommands).toEqual([]);
    expect(result.current.isFeedHalted()).toBe(true);
    expect(mocks.warning).toHaveBeenCalledWith(
      "emergencyStop.unsupported.title",
      expect.anything(),
    );
  });
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
