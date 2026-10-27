import type { SerialPort } from "serialport";
import {
  isBootBanner,
  isUnsolicitedSerialMessage,
  replySeq,
  withSeq,
} from "@magic-vault/shared";
import type { SorterReplyWaiter } from "../interfaces/pi-serial";

export class SorterLink {
  private buffer = "";
  private pending = new Map<number, SorterReplyWaiter>();
  private nextSeq = 1;
  private supportsSeq = false;
  private receivedReply = false;
  private closed = false;
  jamModule: number | null = null;

  constructor(private port: SerialPort) {
    port.on("data", this.onData);
    port.on("error", this.onError);
    port.on("close", this.onClose);
  }

  private onData = (chunk: Buffer) => this.push(chunk.toString("utf8"));
  private onError = (error: Error) => this.close(error);
  private onClose = () => this.close(new Error("The sorter disconnected."));

  private push(text: string) {
    this.buffer += text;
    while (true) {
      const nl = this.buffer.indexOf("\n");
      if (nl < 0) break;
      const raw = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!raw.startsWith("{")) continue;
      let line: Record<string, unknown>;
      try {
        line = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (isBootBanner(line)) {
        if (this.receivedReply) this.close(new Error("The sorter restarted."));
        continue;
      }
      if (isUnsolicitedSerialMessage(line)) {
        if (line.error === "jam") {
          const module = Number(line.module);
          if (Number.isFinite(module) && module !== 1) this.jamModule = module;
        }
        continue;
      }
      const seq = replySeq(line);
      if (seq !== null) this.supportsSeq = true;
      // Firmware before 2.7.0 has no seq. It is safe only with one request.
      const key =
        seq ??
        (!this.supportsSeq && this.pending.size === 1
          ? this.pending.keys().next().value
          : undefined);
      const waiter = key === undefined ? undefined : this.pending.get(key);
      if (!waiter || key === undefined) continue;
      this.pending.delete(key);
      clearTimeout(waiter.timer);
      this.receivedReply = true;
      waiter.resolve(line);
    }
  }

  command(
    payload: object,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    if (this.closed || !this.port.isOpen) {
      return Promise.reject(new Error("The sorter link is closed."));
    }
    if (this.pending.size > 0) {
      return Promise.reject(new Error("The sorter is busy."));
    }
    const seq = this.nextSeq++ >>> 0;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        const error = new Error("The sorter did not answer in time.");
        reject(error);
        // An unnumbered late reply cannot safely be used for a new request.
        if (!this.supportsSeq) this.close(error);
      }, timeoutMs);
      this.pending.set(seq, { resolve, reject, timer });
      this.port.write(withSeq(JSON.stringify(payload), seq).text, (error) => {
        if (!error) return;
        const waiter = this.pending.get(seq);
        if (!waiter) return;
        clearTimeout(waiter.timer);
        this.pending.delete(seq);
        reject(error);
      });
    });
  }

  close(error = new Error("The sorter link is closed.")) {
    this.closed = true;
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
    this.port.off("data", this.onData);
    this.port.off("error", this.onError);
    this.port.off("close", this.onClose);
  }
}
