import type { SerialPort } from "serialport";

type Waiter = {
  resolve: (line: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class SorterLink {
  private buffer = "";
  private pending: Waiter[] = [];
  private closed = false;
  jamModule: number | null = null;

  constructor(private port: SerialPort) {
    port.on("data", (chunk: Buffer) => this.push(chunk.toString("utf8")));
  }

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
      if (line.error === "jam") {
        const module = Number(line.module);
        if (Number.isFinite(module) && module !== 1) this.jamModule = module;
        continue;
      }
      const waiter = this.pending.shift();
      if (!waiter) continue;
      clearTimeout(waiter.timer);
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
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.pending.findIndex((item) => item.resolve === resolve);
        if (index >= 0) this.pending.splice(index, 1);
        reject(new Error("The sorter did not answer in time."));
      }, timeoutMs);
      this.pending.push({ resolve, reject, timer });
      this.port.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) return;
        clearTimeout(timer);
        const index = this.pending.findIndex((item) => item.resolve === resolve);
        if (index >= 0) this.pending.splice(index, 1);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  close() {
    this.closed = true;
    for (const waiter of this.pending) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("The sorter link is closed."));
    }
    this.pending = [];
    this.port.removeAllListeners("data");
  }
}
