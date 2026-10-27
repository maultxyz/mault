import { SERIAL_SEQ_MAX } from "./constants/firmware.constant";
import {
  NEUTRAL_RESPONSE_TIMEOUT_MS,
  ROUTE_RESPONSE_TIMEOUT_MS,
  ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS,
  SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
} from "./constants/serial-timing.constant";
import type { BinRoute } from "./interfaces/bin-routes.interface";
import type {
  CommLogEntry,
  NoLoadedCardRouteResponse,
  PendingSerialReply,
  RouteOptions,
  SerialBootBannerHandler,
  SerialMessageListener,
  SerialReply,
  SerialRequestResult,
  SerialRouteQueue,
  SerialSessionOptions,
  SerialSessionTransport,
  SerialTextDecoder,
  SkippedRouteResponse,
} from "./interfaces/serial-session.interface";
import {
  isBootBanner,
  isBusyResponse,
  isFailedRouteResponse,
  isUnsolicitedSerialMessage,
  parseSerialReply,
  replySeq,
  withSeq,
} from "./serial-protocol";

function emptyRouteQueue(): SerialRouteQueue {
  return { tail: Promise.resolve(null), pending: 0 };
}

export class SerialSession<TTransport extends SerialSessionTransport> {
  private activeTransport: TTransport | null = null;
  private decoder: SerialTextDecoder;
  private buffer = "";
  private pending: PendingSerialReply[] = [];
  private seq = Math.floor(Math.random() * SERIAL_SEQ_MAX);
  private taggedReplies = false;
  private writeQueue: Promise<void> = Promise.resolve();
  private exclusiveCommandRunning = false;
  private routeQueue = emptyRouteQueue();
  private messageListeners = new Set<SerialMessageListener>();
  private commLog: CommLogEntry[] = [];
  private commLogListeners = new Set<() => void>();
  private readonly options: SerialSessionOptions;
  onBootBanner: SerialBootBannerHandler | null = null;

  constructor(options: SerialSessionOptions) {
    this.options = options;
    this.decoder = options.createDecoder();
  }

  get transport(): TTransport | null {
    return this.activeTransport;
  }

  get hasTaggedReplies(): boolean {
    return this.taggedReplies;
  }

  isRunningExclusiveCommand(): boolean {
    return this.exclusiveCommandRunning;
  }

  isBusy(): boolean {
    return this.exclusiveCommandRunning || this.pending.length > 0;
  }

  attach(transport: TTransport): void {
    this.activeTransport = transport;
    this.decoder = this.options.createDecoder();
    this.buffer = "";
    this.pending = [];
    this.taggedReplies = false;
    this.writeQueue = Promise.resolve();
    this.exclusiveCommandRunning = false;
    this.routeQueue = emptyRouteQueue();
    transport.onData((chunk) => {
      if (this.activeTransport === transport) this.handleChunk(chunk);
    });
  }

  detach(): TTransport | null {
    const transport = this.activeTransport;
    this.activeTransport = null;
    this.failPendingReplies();
    this.buffer = "";
    this.taggedReplies = false;
    this.writeQueue = Promise.resolve();
    return transport;
  }

  failPendingReplies(): void {
    for (const entry of this.pending) entry.resolve("");
    this.pending = [];
    this.exclusiveCommandRunning = false;
  }

  subscribe(listener: SerialMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  getCommLog(): CommLogEntry[] {
    return this.commLog;
  }

  subscribeCommLog(listener: () => void): () => void {
    this.commLogListeners.add(listener);
    return () => {
      this.commLogListeners.delete(listener);
    };
  }

  clearCommLog(): void {
    this.commLog = [];
    for (const listener of this.commLogListeners) listener();
  }

  pushCommLog(direction: CommLogEntry["direction"], text: string): void {
    this.commLog = [
      ...this.commLog,
      { direction, text, timestamp: Date.now() },
    ].slice(-this.options.maxCommLogEntries);
    for (const listener of this.commLogListeners) listener();
  }

  private handleChunk(chunk: Uint8Array): void {
    this.buffer += this.decoder.decode(chunk);
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      const rawLine = line.trim();
      if (!rawLine) continue;
      const jsonStart = rawLine.search(/[{[]/);
      const trimmed = jsonStart > 0 ? rawLine.slice(jsonStart) : rawLine;
      this.pushCommLog("received", trimmed);

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }
      for (const listener of this.messageListeners) listener(parsed);
      if (isBootBanner(parsed) && this.onBootBanner?.(parsed)) continue;
      if (isUnsolicitedSerialMessage(parsed)) continue;

      const seq = replySeq(parsed);
      if (seq !== null) {
        this.taggedReplies = true;
        const index = this.pending.findIndex((entry) => entry.seq === seq);
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
    if (!this.activeTransport) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.writeQueue = this.writeQueue.then(async () => {
        const transport = this.activeTransport;
        if (!transport) {
          resolve(false);
          return;
        }
        try {
          this.pushCommLog("sent", text.trim());
          await transport.write(this.options.encodeText(text));
          resolve(true);
        } catch {
          resolve(false);
        }
      });
    });
  }

  sendCommandLine(json: string): Promise<boolean> {
    return this.writeLine(withSeq(json, this.nextSeq()).text);
  }

  sendCommand(command: object): Promise<boolean> {
    return this.sendCommandLine(JSON.stringify(command));
  }

  requestLine(json: string, timeoutMs: number): Promise<SerialRequestResult> {
    if (!this.activeTransport) {
      return Promise.resolve({ sent: false, line: "" });
    }
    const { text, seq } = withSeq(json, this.nextSeq());
    return new Promise<SerialRequestResult>((resolve) => {
      const removeEntry = () => {
        const index = this.pending.indexOf(entry);
        if (index !== -1) this.pending.splice(index, 1);
      };
      const timer = setTimeout(() => {
        removeEntry();
        resolve({ sent: true, line: "" });
      }, timeoutMs);
      const entry: PendingSerialReply = {
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
        removeEntry();
        resolve({ sent: false, line: "" });
      });
    });
  }

  sendRequest(
    command: object,
    timeoutMs = SERIAL_DEFAULT_RESPONSE_TIMEOUT_MS,
  ): Promise<SerialRequestResult> {
    return this.requestLine(JSON.stringify(command), timeoutMs);
  }

  async sendParsed(
    command: object,
    timeoutMs?: number,
  ): Promise<SerialReply | null> {
    const { line } = await this.sendRequest(command, timeoutMs);
    return parseSerialReply(line);
  }

  async runExclusive<TResult, TBusyResult>(
    task: () => Promise<TResult>,
    whenBusy: () => TBusyResult,
  ): Promise<TResult | TBusyResult> {
    if (this.exclusiveCommandRunning) return whenBusy();
    this.exclusiveCommandRunning = true;
    try {
      return await task();
    } finally {
      this.exclusiveCommandRunning = false;
    }
  }

  async sendAwaited(
    command: object,
    timeoutMs: number,
  ): Promise<SerialReply | null> {
    if (!this.activeTransport) return null;
    return this.runExclusive(
      () => this.sendParsed(command, timeoutMs),
      () => null,
    );
  }

  private async isCardLoadedAtModuleOne(): Promise<boolean> {
    const sensors = await this.sendParsed({ readIR: true });
    return Array.isArray(sensors?.ir) && sensors.ir[0] === true;
  }

  private async sendRouteCommand(
    route: BinRoute,
    options: RouteOptions,
  ): Promise<SerialReply | NoLoadedCardRouteResponse | null> {
    if (!this.activeTransport) return null;
    return this.runExclusive<
      SerialReply | NoLoadedCardRouteResponse | null,
      null
    >(
      async () => {
        if (
          options.requireLoadedCard &&
          !(await this.isCardLoadedAtModuleOne())
        ) {
          return { noLoadedCard: true } satisfies NoLoadedCardRouteResponse;
        }
        return this.sendParsed(
          {
            route: {
              module: route.module,
              direction: route.direction,
              ...(options.feedNext ? { feedNext: true } : {}),
            },
          },
          options.feedNext
            ? ROUTE_WITH_FEED_RESPONSE_TIMEOUT_MS
            : ROUTE_RESPONSE_TIMEOUT_MS,
        );
      },
      () => null,
    );
  }

  sendRoute(
    route: BinRoute,
    options: RouteOptions = {},
  ): Promise<
    SerialReply | SkippedRouteResponse | NoLoadedCardRouteResponse | null
  > {
    const queue = this.routeQueue;
    const waitsOnPrevious = queue.pending > 0;
    queue.pending += 1;
    const next = queue.tail
      .then((previous) => {
        if (waitsOnPrevious && isFailedRouteResponse(previous)) {
          return { skipped: true } satisfies SkippedRouteResponse;
        }
        return this.sendRouteCommand(route, options);
      })
      .finally(() => {
        queue.pending -= 1;
      });
    queue.tail = next.catch(() => null);
    return next;
  }

  runAfterRoutes<T>(task: () => Promise<T>): Promise<T> {
    const queue = this.routeQueue;
    const previousTail = queue.tail;
    const result = previousTail.then(task);
    queue.tail = result.then(
      () => previousTail,
      () => previousTail,
    );
    return result;
  }

  async sendNeutral(): Promise<boolean> {
    const reply = await this.runAfterRoutes(() =>
      this.sendAwaited({ neutral: true }, NEUTRAL_RESPONSE_TIMEOUT_MS),
    );
    return reply?.status === "ok";
  }
}
