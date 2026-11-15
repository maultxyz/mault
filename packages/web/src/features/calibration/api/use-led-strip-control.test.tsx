import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useLedStripControl } from "./use-led-strip-control";

const serial = vi.hoisted(() => ({ board: "esp32", sendRequest: vi.fn() }));
vi.mock("@/features/scanner/api/use-serial", () => ({
  useSerial: () => ({ isReady: true, board: serial.board, sendRequest: serial.sendRequest }),
}));
afterEach(cleanup);

it("sends only the latest color once the in-flight command answers", async () => {
  let answerFirstCommand: (value: { sent: boolean; line: string }) => void = () => {};
  serial.sendRequest
    .mockReset()
    .mockImplementationOnce(() => new Promise((resolve) => { answerFirstCommand = resolve; }))
    .mockResolvedValue({ sent: true, line: '{"status":"ok"}' });
  const { result } = renderHook(() => useLedStripControl());

  act(() => result.current.setChannel("red", 10));
  act(() => result.current.setChannel("red", 20));
  act(() => result.current.setChannel("white", 30));
  await act(async () => answerFirstCommand({ sent: true, line: '{"status":"ok"}' }));

  await waitFor(() => expect(serial.sendRequest).toHaveBeenCalledTimes(2));
  expect(serial.sendRequest.mock.calls[0][0]).toEqual({ led: { r: 10, g: 0, b: 0, w: 0 } });
  expect(serial.sendRequest.mock.calls[1][0]).toEqual({ led: { r: 20, g: 0, b: 0, w: 30 } });
  expect(result.current.color).toEqual({ red: 20, green: 0, blue: 0, white: 30 });
  expect(result.current.status).toBe("idle");
});

it("reports firmware without the led command as unsupported", async () => {
  serial.sendRequest.mockReset().mockResolvedValue({ sent: true, line: '{"error":"unknown command"}' });
  const { result } = renderHook(() => useLedStripControl());

  act(() => result.current.setChannel("blue", 255));

  await waitFor(() => expect(result.current.status).toBe("unsupported"));
});

it("only offers the LED bars on ESP32 boards", () => {
  serial.board = "uno_r4";
  const { result } = renderHook(() => useLedStripControl());
  expect(result.current.isSupportedBoard).toBe(false);
  serial.board = "esp32";
});
