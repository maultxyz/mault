import type { NodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { RawData, WebSocket } from "ws";
import type { PiSerialControlMessage } from "@magic-vault/shared";
import { isPiHost } from "./pi-host";
import { authProvider } from "../auth";
import { verifyRequestToken } from "../middleware/auth";
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

async function authorize(token: string | undefined, orgId: string | undefined) {
  if (!token || !orgId) return false;
  const payload = await verifyRequestToken(token);
  if (!payload?.sub) return false;
  const member = await authProvider.resolveOrgMembership(payload.sub, orgId);
  return !!member;
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

export function createPiSerialRouter(
  upgradeWebSocket: NodeWebSocket["upgradeWebSocket"],
) {
  return new Hono().get(
    "/",
    async (c, next) => {
      if (!isPiHost()) return c.notFound();
      const allowed = await authorize(c.req.query("token"), c.req.query("orgId"));
      if (!allowed) return c.text("Unauthorized", 401);
      await next();
    },
    upgradeWebSocket(() => ({
      onOpen(_event, ws) {
        const raw = ws.raw;
        if (!raw) return;
        if (activeSocket) {
          sendControl(raw, { type: "error", reason: "busy" });
          raw.close();
          return;
        }
        activeSocket = raw;
        const clear = () => {
          if (activeSocket === raw) activeSocket = null;
        };
        raw.on("close", clear);
        void runSession(raw).catch(() => {
          sendControl(raw, { type: "error", reason: "open-failed" });
          raw.close();
        });
      },
    })),
  );
}
