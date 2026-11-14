import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_CALIBRATION, type PlayingCardWithDistance } from "@magic-vault/shared";
import { useFoilNudgeCheck } from "./use-foil-nudge-check";

const state = vi.hoisted(() => ({ active: true, send: vi.fn() }));
vi.mock("@/features/calibration/api/use-module-configs", () => ({ useModuleConfigs: () => ({ configs: [{ moduleNumber: 1, calibration: DEFAULT_CALIBRATION }] }) }));
vi.mock("@/features/collections/api/use-collections", () => ({ useCollections: () => ({ activeCollection: { game: { key: "mtg" } } }) }));
vi.mock("@/features/scanner/api/use-foil-detection-game-key", () => ({ useFoilDetectionGameKey: () => "mtg" }));
vi.mock("@/features/scanner/api/use-scanned-cards", () => ({ useScannedCards: () => ({ forceFoilType: null }) }));
vi.mock("@/features/scanner/api/use-serial", () => ({ useSerial: () => ({
  isReady: true, firmwareVersion: "2.13.0", foilNudgeFirmwareLimits: { maxPulse: 20, maxTravelPercent: 50 },
  sendRequest: state.send, runWhenIdle: (run: () => Promise<unknown>) => run(),
}) }));
vi.mock("@/features/scanner/lib/encode-image-data", () => ({ encodeImageAsJpeg: vi.fn() }));
vi.mock("@/lib/delay", () => ({ delay: vi.fn() }));
vi.mock("@/lib/scan-log", () => ({ scanLog: vi.fn() }));
afterEach(cleanup);

it("restores the pusher and skips capture and the second nudge when the browser scan stops", async () => {
  state.active = true;
  state.send.mockReset().mockImplementation(async () => {
    state.active = false;
    return { sent: true, line: '{"status":"ok"}' };
  });
  const capture = vi.fn();
  const { result } = renderHook(() => useFoilNudgeCheck());
  const detection = await result.current({ name: "Card" } as PlayingCardWithDistance, capture,
    { width: 1, height: 1, data: new Uint8ClampedArray(4) }, () => state.active);
  expect(detection).toBeNull();
  expect(capture).not.toHaveBeenCalled();
  expect(state.send).toHaveBeenCalledTimes(2);
  expect(state.send.mock.calls[1][0]).toEqual({ servo: "pusher", module: 1, position: "neutral" });
});
