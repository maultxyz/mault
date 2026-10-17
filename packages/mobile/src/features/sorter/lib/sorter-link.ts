import {
  SERIAL_SEQ_MAX,
  isBootBanner,
  isBusyResponse,
  isFailedRouteResponse,
  isUnsolicitedSerialMessage,
  replySeq,
  withSeq,
  type BinRoute,
} from "@magic-vault/shared";
import {
  FEEDER_RESPONSE_TIMEOUT_MS,
  MAX_COMM_LOG_ENTRIES,
  NEUTRAL_RESPONSE_TIMEOUT_MS,
  ROUTE_RESPONSE_TIMEOUT_MS,
  ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS,
  SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
} from "@/lib/constants/sorter";
import type {
  ByteTransport,
  CommLogEntry,
  PendingReply,
  RouteOptions,
  RouteQueue,
  SerialRequestResult,
  SorterMessage,
  SorterMessageListener,
} from "@/lib/interfaces/sorter";
import { encodeUtf8, Utf8StreamDecoder } from "./bytes";

function parseObject(line: string): SorterMessage | null {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as SorterMessage)
      : null;
  } catch {
    return null;
  }
}

export class SorterLink {
  private transport: ByteTransport | null = null;
  private decoder = new Utf8StreamDecoder();
  private buffer = "";
  private pending: PendingReply[] = [];
  private seq = Math.floor(Math.random() * SERIAL_SEQ_MAX);
  private taggedReplies = false;
  private writeQueue: Promise<void> = Promise.resolve();
  private busy = false;
  private routeQueue: RouteQueue = { tail: Promise.resolve(null), pending: 0 };
  private listeners = new Set<SorterMessageListener>();
  private log: CommLogEntry[] = [];
  private logListeners = new Set<(log: CommLogEntry[]) => void>();
  bootListener: ((message: unknown) => void) | null = null;

  get activeTransport(): ByteTransport | null {
    return this.transport;
  }

  get hasTaggedReplies(): boolean {
    return this.taggedReplies;
  }

  isBusy(): boolean {
    return this.busy || this.pending.length > 0;
  }

  attach(transport: ByteTransport): void {
    this.transport = transport;
    this.decoder = new Utf8StreamDecoder();
    this.buffer = "";
    this.pending = [];
    this.taggedReplies = false;
    this.busy = false;
    this.routeQueue = { tail: Promise.resolve(null), pending: 0 };
    this.log = [];
    this.emitLog();
    transport.onData((chunk) => this.handleChunk(chunk));
  }

  detach(): ByteTransport | null {
    const transport = this.transport;
    this.transport = null;
    this.failPending();
    return transport;
  }

  failPending(): void {
    for (const entry of this.pending) entry.resolve("");
    this.pending = [];
    this.busy = false;
  }

  subscribe(listener: SorterMessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeLog(listener: (log: CommLogEntry[]) => void): () => void {
    this.logListeners.add(listener);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  private pushLog(direction: CommLogEntry["direction"], text: string): void {
    this.log = [...this.log, { direction, text, timestamp: Date.now() }].slice(
      -MAX_COMM_LOG_ENTRIES,
    );
    this.emitLog();
  }

  private emitLog(): void {
    for (const listener of this.logListeners) listener(this.log);
  }

  private handleChunk(chunk: Uint8Array): void {
    this.buffer += this.decoder.decode(chunk);
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      const raw = line.trim();
      if (!raw) continue;
      const jsonStart = raw.search(/[{[]/);
      const trimmed = jsonStart > 0 ? raw.slice(jsonStart) : raw;
      this.pushLog("received", trimmed);

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }
      for (const listener of this.listeners) listener(parsed);
      if (this.bootListener && this.taggedReplies && isBootBanner(parsed)) {
        this.bootListener(parsed);
        continue;
      }
      if (isUnsolicitedSerialMessage(parsed)) continue;

      const seq = replySeq(parsed);
      if (seq !== null) {
        this.taggedReplies = true;
        const index = this.pending.findIndex((p) => p.seq === seq);
        if (index !== -1) this.pending.splice(index, 1)[0].resolve(trimmed);
        continue;
      }
      if (this.taggedReplies) continue;

      const entry =
        isBusyResponse(parsed) && this.pending.length > 1
          ? this.pending.splice(1, 1)[0]
          : this.pending.shift();
      entry?.resolve(trimmed);
    }
  }

  private nextSeq(): number {
    this.seq = this.seq >= SERIAL_SEQ_MAX ? 1 : this.seq + 1;
    return this.seq;
  }

  private writeLine(text: string): Promise<boolean> {
    if (!this.transport) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.writeQueue = this.writeQueue.then(async () => {
        const transport = this.transport;
        if (!transport) {
          resolve(false);
          return;
        }
        try {
          this.pushLog("sent", text.trim());
          await transport.write(encodeUtf8(text));
          resolve(true);
        } catch {
          resolve(false);
        }
      });
    });
  }

  sendCommand(command: object): Promise<boolean> {
    return this.writeLine(withSeq(JSON.stringify(command), this.nextSeq()).text);
  }

  sendRequest(
    command: object,
    timeoutMs = SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
  ): Promise<SerialRequestResult> {
    if (!this.transport) return Promise.resolve({ sent: false, line: "" });
    const { text, seq } = withSeq(JSON.stringify(command), this.nextSeq());
    return new Promise<SerialRequestResult>((resolve) => {
      const remove = () => {
        const index = this.pending.indexOf(entry);
        if (index !== -1) this.pending.splice(index, 1);
      };
      const timer = setTimeout(() => {
        remove();
        resolve({ sent: true, line: "" });
      }, timeoutMs);
      const entry: PendingReply = {
        seq,
        resolve: (line) => {
          clearTimeout(timer);
          resolve({ sent: true, line });
        },
      };
      this.pending.push(entry);
      void this.writeLine(text).then((sent) => {
        if (sent) return;
        clearTimeout(timer);
        remove();
        resolve({ sent: false, line: "" });
      });
    });
  }

  async sendParsed(command: object, timeoutMs?: number): Promise<SorterMessage | null> {
    const { line } = await this.sendRequest(command, timeoutMs);
    return line ? parseObject(line) : null;
  }

  async sendAwaited(payload: object, timeoutMs: number): Promise<SorterMessage | null> {
    if (!this.transport || this.busy) return null;
    this.busy = true;
    try {
      return await this.sendParsed(payload, timeoutMs);
    } finally {
      this.busy = false;
    }
  }

  sendRoute(route: BinRoute, options: RouteOptions = {}): Promise<unknown> {
    const queue = this.routeQueue;
    const waitsOnPrevious = queue.pending > 0;
    queue.pending += 1;
    const next = queue.tail
      .then((previous) => {
        if (waitsOnPrevious && isFailedRouteResponse(previous)) {
          return { skipped: true };
        }
        return this.sendAwaited(
          {
            route: {
              module: route.module,
              direction: route.direction,
              ...(options.feedNext ? { feedNext: true } : {}),
            },
          },
          options.feedNext ? ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS : ROUTE_RESPONSE_TIMEOUT_MS,
        );
      })
      .finally(() => {
        queue.pending -= 1;
      });
    queue.tail = next.catch(() => null);
    return next;
  }

  private runAfterRoutes<T>(task: () => Promise<T>): Promise<T> {
    const queue = this.routeQueue;
    const previousTail = queue.tail;
    const result = previousTail.then(task);
    queue.tail = result.then(
      () => previousTail,
      () => previousTail,
    );
    return result;
  }

  feed(): Promise<SorterMessage | null> {
    return this.runAfterRoutes(() => this.sendParsed({ feeder: true }, FEEDER_RESPONSE_TIMEOUT_MS));
  }

  sendNeutral(): Promise<boolean> {
    return this.runAfterRoutes(async () => {
      const reply = await this.sendAwaited({ neutral: true }, NEUTRAL_RESPONSE_TIMEOUT_MS);
      return reply?.status === "ok";
    });
  }
}
