import { EventEmitter } from "node:events";
import { SERIAL_SEQ_MAX, replySeq } from "@magic-vault/shared";
import {
  PI_CONTROLLER_COMMAND_TIMEOUT_MS,
  PI_CONTROLLER_MAX_LINE_LENGTH,
  PI_CONTROLLER_MAX_QUEUED_COMMANDS,
} from "./constants/pi-controller";
import type {
  PiControllerCommand,
  PiControllerPortFactory,
} from "./interfaces/pi-controller";
import type { SorterPort, SorterPortOwner } from "./interfaces/pi-serial";

function isReadOnly(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload).filter((key) => key !== "seq");
  return (
    keys.length === 1 &&
    ((keys[0] === "getStatus" && payload.getStatus === true) ||
      (keys[0] === "readIR" && payload.readIR === true) ||
      keys[0] === "getStoredConfig")
  );
}

export class PiControllerClient extends EventEmitter implements SorterPort {
  isOpen = true;
  private buffer = "";

  constructor(
    private hub: PiControllerHub,
    readonly owner: SorterPortOwner,
  ) {
    super();
  }

  write(data: string | Buffer, callback?: (error?: Error | null) => void) {
    if (!this.isOpen) {
      callback?.(new Error("The controller connection is closed."));
      return false;
    }
    this.buffer += data.toString();
    while (this.buffer.includes("\n")) {
      const newline = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length > PI_CONTROLLER_MAX_LINE_LENGTH) {
        this.receive({ error: "Controller command is too large." });
        continue;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(line);
      } catch {
        this.receive({ error: "Invalid controller command." });
        continue;
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        this.receive({ error: "Controller command must be an object." });
        continue;
      }
      this.hub.enqueue(this, payload as Record<string, unknown>);
    }
    if (this.buffer.length > PI_CONTROLLER_MAX_LINE_LENGTH) this.close();
    callback?.(null);
    return true;
  }

  receive(message: Record<string, unknown>) {
    if (this.isOpen)
      this.emit("data", Buffer.from(`${JSON.stringify(message)}\n`));
  }

  finish(error?: Error) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (error && this.listenerCount("error")) this.emit("error", error);
    this.emit("close");
  }

  close() {
    this.hub.detach(this);
  }
}

export class PiControllerHub {
  private clients = new Set<PiControllerClient>();
  private port: SorterPort | null = null;
  private opening: Promise<SorterPort> | null = null;
  private exclusiveOwner: SorterPortOwner | null = null;
  private queue: PiControllerCommand[] = [];
  private active: PiControllerCommand | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private buffer = "";
  private sequence = 0;
  private status: Record<string, unknown> | null = null;

  constructor(
    private createPort: PiControllerPortFactory,
    private timeoutMs = PI_CONTROLLER_COMMAND_TIMEOUT_MS,
  ) {}

  owner(): SorterPortOwner | null {
    return this.exclusiveOwner ?? (this.clients.size ? "bridge" : null);
  }

  async open(owner: SorterPortOwner): Promise<PiControllerClient> {
    if (owner !== "bridge") {
      if (this.exclusiveOwner || (this.active && !this.active.readOnly)) {
        throw new Error("busy");
      }
      this.exclusiveOwner = owner;
    }
    try {
      if (!this.port) {
        if (!this.opening) {
          this.opening = this.createPort()
            .then((port) => {
              this.port = port;
              port.on("data", this.onData);
              port.on("close", this.onClose);
              port.on("error", this.onError);
              return port;
            })
            .finally(() => {
              this.opening = null;
            });
        }
        await this.opening;
      }
      const client = new PiControllerClient(this, owner);
      this.clients.add(client);
      return client;
    } catch (error) {
      if (owner !== "bridge") this.exclusiveOwner = null;
      throw error;
    }
  }

  release(owner: SorterPortOwner, port?: SorterPort) {
    for (const client of [...this.clients]) {
      if (client.owner === owner && (!port || client === port)) client.close();
    }
  }

  enqueue(client: PiControllerClient, payload: Record<string, unknown>) {
    const command: PiControllerCommand = {
      client,
      payload,
      originalSeq: replySeq(payload),
      readOnly: isReadOnly(payload),
    };
    if (
      (!command.readOnly &&
        this.exclusiveOwner &&
        client.owner !== this.exclusiveOwner) ||
      (!command.readOnly &&
        this.active &&
        !this.active.readOnly &&
        (this.active.client !== client ||
          !("setConfig" in this.active.payload))) ||
      this.queue.length >= PI_CONTROLLER_MAX_QUEUED_COMMANDS
    ) {
      this.reply(command, { error: "busy" });
      return;
    }
    if (
      this.active &&
      payload.getStatus === true &&
      command.readOnly &&
      this.status
    ) {
      this.reply(command, this.status);
      return;
    }
    if (
      this.active &&
      !this.active.readOnly &&
      command.readOnly &&
      this.active.client !== client
    ) {
      this.reply(command, { error: "busy" });
      return;
    }
    this.queue.push(command);
    this.pump();
  }

  private reply(
    command: PiControllerCommand,
    payload: Record<string, unknown>,
  ) {
    const response = { ...payload };
    delete response.seq;
    if (command.originalSeq !== null) response.seq = command.originalSeq;
    command.client.receive(response);
  }

  private pump() {
    if (this.active || !this.port) return;
    const command = this.queue.shift();
    if (!command) return;
    if (!command.client.isOpen) {
      this.pump();
      return;
    }
    if (
      !command.readOnly &&
      this.exclusiveOwner &&
      command.client.owner !== this.exclusiveOwner
    ) {
      this.reply(command, { error: "busy" });
      this.pump();
      return;
    }
    this.sequence = this.sequence >= SERIAL_SEQ_MAX ? 1 : this.sequence + 1;
    command.wireSeq = this.sequence;
    this.active = command;
    this.timer = setTimeout(
      () => this.shutdown(new Error("Controller command timed out.")),
      this.timeoutMs,
    );
    this.port.write(
      `${JSON.stringify({ ...command.payload, seq: this.sequence })}\n`,
      (error) => {
        if (error) this.shutdown(error);
      },
    );
  }

  private onData = (chunk: Buffer) => {
    this.buffer += chunk.toString();
    while (this.buffer.includes("\n")) {
      const newline = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(line);
        if (!payload || typeof payload !== "object" || Array.isArray(payload))
          continue;
      } catch {
        continue;
      }
      const sequence = replySeq(payload);
      if (sequence === null) {
        for (const client of this.clients) client.receive(payload);
        continue;
      }
      const command = this.active;
      if (!command || sequence !== command.wireSeq) continue;
      if (
        command.payload.getStatus === true &&
        command.readOnly &&
        typeof payload.version === "string"
      ) {
        this.status = { ...payload };
      }
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.active = null;
      this.reply(command, payload);
      this.pump();
    }
  };

  private onClose = () =>
    this.shutdown(new Error("The controller disconnected."));
  private onError = (error: Error) => this.shutdown(error);

  detach(client: PiControllerClient) {
    if (!this.clients.delete(client)) return;
    if (this.active?.client === client && !this.active.readOnly) {
      this.shutdown(new Error("The active controller client disconnected."));
      client.finish();
      return;
    }
    this.queue = this.queue.filter((command) => command.client !== client);
    if (client.owner === this.exclusiveOwner) this.exclusiveOwner = null;
    client.finish();
    if (!this.clients.size) this.shutdown();
  }

  private shutdown(error?: Error) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.active = null;
    this.queue = [];
    this.status = null;
    this.buffer = "";
    this.exclusiveOwner = null;
    const port = this.port;
    this.port = null;
    if (port) {
      port.off("data", this.onData);
      port.off("close", this.onClose);
      port.off("error", this.onError);
      port.close();
    }
    const clients = [...this.clients];
    this.clients.clear();
    for (const client of clients) client.finish(error);
  }
}
