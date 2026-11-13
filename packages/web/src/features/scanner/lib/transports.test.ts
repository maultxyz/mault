import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  getRequestAuth: vi.fn(async () => ({
    token: "test-token",
    orgId: "test-org",
  })),
}));
vi.mock("@/lib/constants/api", () => ({ API_BASE: "" }));

import { getRequestAuth } from "@/lib/api/client";
import { PiSerialTransport } from "./transports";

class FakeSocket extends EventTarget {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: FakeSocket[] = [];
  readonly url: string;
  readyState = 1;
  binaryType = "";
  sent: unknown[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;
    FakeSocket.instances.push(this);
    queueMicrotask(() => this.onmessage?.({ data: '{"type":"ready"}' }));
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
    this.dispatchEvent(new Event("close"));
  }
}

describe("Pi hardware endpoint selection", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.mocked(getRequestAuth).mockResolvedValue({
      token: "test-token",
      orgId: "test-org",
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("attaches built-in hardware through pi-sorter without sending a motion command", async () => {
    const result = await PiSerialTransport.open(true);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected a connected transport");
    expect(result.transport.kind).toBe("pi-sorter");
    const socket = FakeSocket.instances[0];
    const url = new URL(socket.url);
    expect(url.pathname).toBe("/api/pi-sorter");
    expect(url.searchParams.get("orgId")).toBe("test-org");
    expect(socket.sent).toEqual([]);
    await result.transport.close();
  });

  it("keeps the USB-on-Pi bridge on pi-serial when direct mode is disabled", async () => {
    const result = await PiSerialTransport.open(false);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected a connected transport");
    expect(result.transport.kind).toBe("pi");
    expect(new URL(FakeSocket.instances[0].url).pathname).toBe(
      "/api/pi-serial",
    );
    await result.transport.close();
  });

  it("does not open a hardware socket without authentication", async () => {
    vi.mocked(getRequestAuth).mockResolvedValue({ token: null, orgId: null });
    expect((await PiSerialTransport.open(true)).ok).toBe(false);
    expect(FakeSocket.instances).toEqual([]);
  });
});
