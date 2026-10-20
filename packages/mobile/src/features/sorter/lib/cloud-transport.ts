import {
  SORTER_LINK_CLIENT_PATH,
  SORTER_LINK_CLOSE_IN_USE,
  SORTER_LINK_CLOSE_OFFLINE,
  SORTER_LINK_READY_KEY,
  SORTER_LINK_READY_VALUE,
} from "@magic-vault/shared";
import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import { SORTER_LINK_OPEN_TIMEOUT_MS } from "@/lib/constants/sorter";
import type { ByteTransport, CloudOpenResult, SorterErrorCode } from "@/lib/interfaces/sorter";
import { encodeUtf8, Utf8StreamDecoder } from "./bytes";

function isSorterLinkReady(data: unknown): boolean {
  if (typeof data !== "string") return false;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return parsed[SORTER_LINK_READY_KEY] === SORTER_LINK_READY_VALUE;
  } catch {
    return false;
  }
}

function closeReason(code: number): SorterErrorCode {
  if (code === SORTER_LINK_CLOSE_OFFLINE) return "sorter-offline";
  if (code === SORTER_LINK_CLOSE_IN_USE) return "sorter-in-use";
  return "connect-failed";
}

async function clientUrl(deviceGuid: string): Promise<string | null> {
  const { token, orgId } = await getRequestAuth();
  if (!token || !orgId) return null;
  const params = new URLSearchParams({ token, orgId, device: deviceGuid });
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api${SORTER_LINK_CLIENT_PATH}?${params.toString()}`;
}

export class CloudTransport implements ByteTransport {
  readonly name = null;
  private started = false;
  private closed = false;
  private backlog: Uint8Array[] = [];
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;

  private constructor(
    readonly id: string,
    private readonly socket: WebSocket,
  ) {
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const chunk = encodeUtf8(event.data);
      if (this.started) this.dataCb?.(chunk);
      else this.backlog.push(chunk);
    };
    socket.onclose = () => {
      this.closed = true;
      if (this.started) this.disconnectCb?.();
    };
  }

  static async open(deviceGuid: string): Promise<CloudOpenResult> {
    const url = await clientUrl(deviceGuid);
    if (!url) return { ok: false, code: "connect-failed" };
    return new Promise((resolve) => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        resolve({ ok: false, code: "connect-failed" });
        return;
      }
      const timeout = setTimeout(() => {
        socket.close();
        resolve({ ok: false, code: "connect-failed" });
      }, SORTER_LINK_OPEN_TIMEOUT_MS);
      socket.onmessage = (event) => {
        clearTimeout(timeout);
        if (!isSorterLinkReady(event.data)) {
          socket.close();
          resolve({ ok: false, code: "connect-failed" });
          return;
        }
        resolve({ ok: true, transport: new CloudTransport(deviceGuid, socket) });
      };
      socket.onclose = (event) => {
        clearTimeout(timeout);
        resolve({ ok: false, code: closeReason(event.code) });
      };
    });
  }

  async start(): Promise<void> {
    this.started = true;
    const pending = this.backlog;
    this.backlog = [];
    for (const chunk of pending) this.dataCb?.(chunk);
    if (this.closed) this.disconnectCb?.();
  }

  onData(cb: (chunk: Uint8Array) => void): void {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }

  setMtu(): void {}

  async write(data: Uint8Array): Promise<void> {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error("Sorter link is closed.");
    this.socket.send(new Utf8StreamDecoder().decode(data));
  }

  async close(): Promise<void> {
    this.started = false;
    this.socket.close(1000);
  }
}
