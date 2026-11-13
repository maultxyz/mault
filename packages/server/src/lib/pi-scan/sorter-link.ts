import {
  SerialSession,
  isBootBanner,
  isUnsolicitedSerialMessage,
  parseSerialReply,
} from "@magic-vault/shared";
import { PI_SCAN_COMM_LOG_ENTRIES } from "../constants/pi-scan";
import type { SorterPort } from "../interfaces/pi-serial";

export class SorterLink {
  private session = new SerialSession({
    createDecoder: () => new TextDecoder(),
    encodeText: (text) => new TextEncoder().encode(text),
    maxCommLogEntries: PI_SCAN_COMM_LOG_ENTRIES,
  });
  private receivedReply = false;
  private closedError: Error | null = null;
  jamModule: number | null = null;
  firmwareVersion: string | null = null;
  private fedListener: ((reply: Record<string, unknown>) => void) | null = null;

  onFed(listener: (reply: Record<string, unknown>) => void): () => void {
    this.fedListener = listener;
    return () => {
      this.fedListener = null;
    };
  }

  constructor(private port: SorterPort) {
    this.session.onReply = (reply) => {
      this.receivedReply = true;
      if (
        reply &&
        typeof reply === "object" &&
        "version" in reply &&
        typeof reply.version === "string"
      ) {
        this.firmwareVersion = reply.version;
      }
    };
    this.session.onBootBanner = () => {
      if (this.receivedReply) this.close(new Error("The sorter restarted."));
      return true;
    };
    this.session.subscribe((message) => {
      if (
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        isBootBanner(message)
      )
        return;
      const line = message as Record<string, unknown>;
      if (!isUnsolicitedSerialMessage(line)) return;
      if (line.event === "fed") this.fedListener?.(line);
      if (line.error === "jam") {
        const module = Number(line.module);
        if (Number.isFinite(module) && module !== 1) this.jamModule = module;
      }
    });
    this.session.attach({
      write: (data: Uint8Array) =>
        new Promise<void>((resolve, reject) => {
          port.write(Buffer.from(data), (error) =>
            error ? reject(error) : resolve(),
          );
        }),
      onData: (listener: (chunk: Uint8Array) => void) => {
        this.onData = listener;
        port.on("data", listener);
      },
    });
    port.on("error", this.onError);
    port.on("close", this.onClose);
  }

  private onData: ((chunk: Uint8Array) => void) | null = null;
  private onError = (error: Error) => this.close(error);
  private onClose = () => this.close(new Error("The sorter disconnected."));

  async command(
    payload: object,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    if (this.closedError || !this.port.isOpen)
      throw new Error("The sorter link is closed.");
    if (this.session.isBusy()) throw new Error("The sorter is busy.");
    const reply = await this.session.sendRequest(payload, timeoutMs);
    if (this.closedError) throw this.closedError;
    const parsed = parseSerialReply(reply.line);
    if (!reply.sent || !parsed) {
      const error = new Error(
        reply.sent
          ? "The sorter did not answer in time."
          : "The sorter command could not be sent.",
      );
      if (!this.session.hasTaggedReplies) this.close(error);
      throw error;
    }
    return parsed;
  }

  close(error = new Error("The sorter link is closed.")) {
    if (this.closedError) return;
    this.closedError = error;
    this.session.detach();
    this.fedListener = null;
    if (this.onData) this.port.off("data", this.onData);
    this.port.off("error", this.onError);
    this.port.off("close", this.onClose);
  }
}
