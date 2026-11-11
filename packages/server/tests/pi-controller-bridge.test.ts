import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { WebSocket, WebSocketServer } from "ws";
import { openPiSerialSocket } from "../src/lib/pi-serial-bridge";
import { releaseSorterPort } from "../src/lib/pi-serial-port";

test("desktop and phone WebSockets both stay ready and receive only their own replies", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "pi-shared-bridge-"));
  const path = join(directory, "controller.sock");
  let physicalConnections = 0;
  const commands: Record<string, unknown>[] = [];
  const controller = createServer((socket) => {
    physicalConnections++;
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      while (buffer.includes("\n")) {
        const newline = buffer.indexOf("\n");
        const command = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        commands.push(command);
        socket.write(
          `${JSON.stringify({ seq: command.seq, version: "pi-0.1.0", board: "raspberry_pi", servoDriver: "ok", marker: command.getStatus ? "desktop" : "phone" })}\n`,
        );
      }
    });
  });
  const previousHost = process.env.PI_HOST;
  const previousSorter = process.env.PI_SORTER;
  const previousSocket = process.env.PI_CONTROLLER_SOCKET;
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "1";
  process.env.PI_CONTROLLER_SOCKET = path;
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  server.on("connection", openPiSerialSocket);
  const clients: WebSocket[] = [];
  context.after(async () => {
    for (const client of clients) client.terminate();
    releaseSorterPort("bridge");
    for (const [key, value] of [
      ["PI_HOST", previousHost],
      ["PI_SORTER", previousSorter],
      ["PI_CONTROLLER_SOCKET", previousSocket],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => controller.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  controller.listen(path);
  await once(controller, "listening");
  if (!server.address()) await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `ws://127.0.0.1:${address.port}`;
  const desktop = new WebSocket(url);
  const desktopReady = once(desktop, "message");
  clients.push(desktop);
  assert.equal(JSON.parse((await desktopReady)[0].toString()).type, "ready");
  const mobile = new WebSocket(url);
  const mobileReady = once(mobile, "message");
  clients.push(mobile);
  assert.equal(JSON.parse((await mobileReady)[0].toString()).type, "ready");
  const desktopReply = once(desktop, "message");
  const mobileReply = once(mobile, "message");
  desktop.send(Buffer.from('{"getStatus":true,"seq":1}\n'));
  mobile.send(Buffer.from('{"getStoredConfig":true,"seq":1}\n'));
  assert.equal(
    JSON.parse((await desktopReply)[0].toString()).marker,
    "desktop",
  );
  assert.equal(JSON.parse((await mobileReply)[0].toString()).marker, "phone");
  assert.equal(physicalConnections, 1);
  assert.equal(commands.length, 2);
  desktop.close();
  await once(desktop, "close");
  const stillConnected = once(mobile, "message");
  mobile.send(Buffer.from('{"getStatus":true,"seq":2}\n'));
  assert.equal(
    JSON.parse((await stillConnected)[0].toString()).servoDriver,
    "ok",
  );
  assert.equal(physicalConnections, 1);
});
