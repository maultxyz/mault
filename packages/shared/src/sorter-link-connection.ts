import {
  SORTER_LINK_CLOSE_IN_USE,
  SORTER_LINK_CLOSE_OFFLINE,
  SORTER_LINK_READY_KEY,
  SORTER_LINK_READY_VALUE,
} from "./constants/sorter-link.constant";
import { SORTER_LINK_OPEN_TIMEOUT_MS } from "./constants/serial-timing.constant";
import type {
  SorterLinkOpenFailure,
  SorterLinkSocketOpenResult,
  SorterLinkTextCodec,
} from "./interfaces/sorter-link.interface";
import { parseSerialReply } from "./serial-protocol";

function isSorterLinkReady(data: unknown): boolean {
  if (typeof data !== "string") return false;
  return (
    parseSerialReply(data)?.[SORTER_LINK_READY_KEY] === SORTER_LINK_READY_VALUE
  );
}

function sorterLinkCloseReason(code: number): SorterLinkOpenFailure {
  if (code === SORTER_LINK_CLOSE_OFFLINE) return "offline";
  if (code === SORTER_LINK_CLOSE_IN_USE) return "inUse";
  return "failed";
}

export function openSorterLinkSocket(
  url: string,
): Promise<SorterLinkSocketOpenResult> {
  return new Promise((resolve) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      resolve({ ok: false, reason: "failed" });
      return;
    }
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ ok: false, reason: "failed" });
    }, SORTER_LINK_OPEN_TIMEOUT_MS);
    socket.onmessage = (event) => {
      clearTimeout(timeout);
      if (!isSorterLinkReady(event.data)) {
        socket.close();
        resolve({ ok: false, reason: "failed" });
        return;
      }
      resolve({ ok: true, socket });
    };
    socket.onclose = (event) => {
      clearTimeout(timeout);
      resolve({ ok: false, reason: sorterLinkCloseReason(event.code) });
    };
  });
}

export class SorterLinkConnection {
  private readonly socket: WebSocket;
  private readonly codec: SorterLinkTextCodec;
  private started = false;
  private closed = false;
  private backlog: Uint8Array[] = [];
  private dataListener: ((chunk: Uint8Array) => void) | null = null;
  private disconnectListener: (() => void) | null = null;
  private errorListener: ((error: unknown) => void) | null = null;

  protected constructor(socket: WebSocket, codec: SorterLinkTextCodec) {
    this.socket = socket;
    this.codec = codec;
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const chunk = this.codec.encodeText(event.data);
      if (this.started) this.dataListener?.(chunk);
      else this.backlog.push(chunk);
    };
    socket.onerror = (event) => {
      if (this.started) this.errorListener?.(event);
    };
    socket.onclose = () => {
      this.closed = true;
      if (this.started) this.disconnectListener?.();
    };
  }

  start(): void {
    this.started = true;
    const pending = this.backlog;
    this.backlog = [];
    for (const chunk of pending) this.dataListener?.(chunk);
    if (this.closed) this.disconnectListener?.();
  }

  onData(listener: (chunk: Uint8Array) => void): void {
    this.dataListener = listener;
  }

  onDisconnect(listener: () => void): void {
    this.disconnectListener = listener;
  }

  onError(listener: (error: unknown) => void): void {
    this.errorListener = listener;
  }

  async write(data: Uint8Array): Promise<void> {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Sorter link is closed.");
    }
    this.socket.send(this.codec.decodeBytes(data));
  }

  async close(): Promise<void> {
    this.started = false;
    this.socket.close(1000);
  }
}
