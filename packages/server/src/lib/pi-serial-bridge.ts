import type { RawData, WebSocket } from "ws";
import type { PiSerialControlMessage } from "@magic-vault/shared";
import {
  claimSorterPort,
  releaseSorterPort,
  SorterPortError,
} from "./pi-serial-port";

let activeSocket: WebSocket | null = null;

function sendControl(socket: WebSocket, message: PiSerialControlMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

async function runSession(socket: WebSocket) {
  let port;
  try {
    port = await claimSorterPort("bridge");
  } catch (error) {
    const reason = error instanceof SorterPortError ? error.reason : "open-failed";
    sendControl(socket, { type: "error", reason });
    socket.close();
    return;
  }

  const early: Buffer[] = [];
  let ready = false;
  let released = false;

  const release = () => {
    if (released) return;
    released = true;
    releaseSorterPort("bridge");
    if (socket.readyState === socket.OPEN) socket.close();
  };

  port.on("data", (chunk: Buffer) => {
    const copy = Buffer.from(chunk);
    if (!ready) {
      early.push(copy);
      return;
    }
    if (socket.readyState === socket.OPEN) socket.send(copy);
  });
  port.on("close", release);
  port.on("error", release);
  socket.on("message", (data, isBinary) => {
    if (!isBinary || !port.isOpen) return;
    port.write(toBuffer(data));
  });
  socket.on("close", release);
  socket.on("error", release);

  sendControl(socket, { type: "ready" });
  ready = true;
  for (const chunk of early) {
    if (socket.readyState === socket.OPEN) socket.send(chunk);
  }
}

export function openPiSerialSocket(socket: WebSocket) {
  if (activeSocket) {
    sendControl(socket, { type: "error", reason: "busy" });
    socket.close();
    return;
  }
  activeSocket = socket;
  const clear = () => {
    if (activeSocket === socket) activeSocket = null;
  };
  socket.on("close", clear);
  void runSession(socket).catch(() => {
    sendControl(socket, { type: "error", reason: "open-failed" });
    socket.close();
  });
}
