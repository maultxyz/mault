import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getAuthHeaders } from "@/lib/api/client";
import { acquirePiRelayStream } from "./pi-camera";

vi.mock("@/lib/api/client", () => ({ getAuthHeaders: vi.fn() }));

const stop = vi.fn();

beforeEach(() => {
  vi.mocked(getAuthHeaders).mockResolvedValue({ Authorization: "Bearer test" });
  const track = { stop, requestFrame: vi.fn() };
  const stream = { getVideoTracks: () => [track] };
  vi.spyOn(document, "createElement").mockReturnValue({
    getContext: () => ({}),
    captureStream: () => stream,
  } as unknown as HTMLCanvasElement);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it.each(["auth", "fetch", "http"])("releases the canvas track when initial %s fails", async (stage) => {
  if (stage === "auth") vi.mocked(getAuthHeaders).mockRejectedValueOnce(new Error("auth failed"));
  else if (stage === "fetch") vi.mocked(fetch).mockRejectedValueOnce(new Error("network failed"));
  else vi.mocked(fetch).mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
  await expect(acquirePiRelayStream()).rejects.toThrow();
  expect(stop).toHaveBeenCalledOnce();
});

it("cancels an acquisition waiting for auth without opening a late HTTP stream", async () => {
  let finish: () => void = () => {};
  vi.mocked(getAuthHeaders).mockImplementationOnce(() => new Promise((resolve) => {
    finish = () => resolve({ Authorization: "Bearer test" });
  }));
  const controller = new AbortController();
  const pending = acquirePiRelayStream(undefined, controller.signal);
  const rejected = expect(pending).rejects.toThrow();
  controller.abort();
  expect(stop).toHaveBeenCalled();
  finish();
  await rejected;
  expect(fetch).not.toHaveBeenCalled();
});

it("aborts an in-flight HTTP stream acquisition and releases its track", async () => {
  let requestSignal: AbortSignal | undefined;
  vi.mocked(fetch).mockImplementationOnce((_url, options) => new Promise((_, reject) => {
    requestSignal = options?.signal ?? undefined;
    requestSignal?.addEventListener("abort", () => reject(requestSignal?.reason), { once: true });
  }));
  const controller = new AbortController();
  const pending = acquirePiRelayStream(undefined, controller.signal);
  const rejected = expect(pending).rejects.toThrow();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  controller.abort();
  await rejected;
  expect(requestSignal?.aborted).toBe(true);
  expect(stop).toHaveBeenCalled();
});
