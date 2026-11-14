import { EventEmitter } from "node:events";
import { createConnection, type Socket } from "node:net";
import { PI_CONTROLLER_CONNECT_TIMEOUT_MS } from "./constants/pi-serial";
import type { SorterPort } from "./interfaces/pi-serial";

export class PiControllerPort extends EventEmitter implements SorterPort {
  private constructor(private socket: Socket) {
    super();
    socket.on("data", (data: Buffer) => this.emit("data", data));
    socket.on("close", () => this.emit("close"));
    socket.on("error", (error: Error) => {
      if (this.listenerCount("error")) this.emit("error", error);
    });
  }

  static open(path: string): Promise<PiControllerPort> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ path });
      const failed = (error: Error) => {
        socket.destroy();
        reject(error);
      };
      socket.once("error", failed);
      socket.setTimeout(PI_CONTROLLER_CONNECT_TIMEOUT_MS, () =>
        failed(new Error("Controller connection timed out")),
      );
      socket.once("connect", () => {
        socket.setTimeout(0);
        const port = new PiControllerPort(socket);
        socket.off("error", failed);
        resolve(port);
      });
    });
  }

  get isOpen(): boolean {
    return !this.socket.destroyed && !this.socket.connecting;
  }

  write(data: string | Buffer, callback?: (error?: Error | null) => void) {
    return this.socket.write(data, callback);
  }

  close() {
    this.socket.destroy();
  }
}
