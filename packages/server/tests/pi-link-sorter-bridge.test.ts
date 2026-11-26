import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocketServer, type WebSocket } from "ws";
import type { SorterPort } from "../src/lib/interfaces/pi-serial";
import { createPiSorterBridge, piSorterBridgeRuntime } from "../src/lib/pi-link-device/sorter-bridge";

class FakeSorterPort extends EventEmitter implements SorterPort {
  isOpen = true;
  written: string[] = [];
  write(data: string | Buffer) {
    this.written.push(data.toString());
    return true;
  }
  close() {
    this.isOpen = false;
  }
}

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve) => socket.once("message", (data) => resolve(data.toString())));
}

async function waitFor(check: () => boolean) {
  for (let attempt = 0; attempt < 200 && !check(); attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(check(), "timed out");
}

test("the Pi bridges its sorter to the relay, and refuses while a scan holds the port", async () => {
  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port: serverPort } = server.address() as AddressInfo;
  const connections: { socket: WebSocket; headers: Record<string, string | string[] | undefined>; path?: string }[] = [];
  server.on("connection", (socket, request) => connections.push({ socket, headers: request.headers, path: request.url }));

  const ports: FakeSorterPort[] = [];
  const released: FakeSorterPort[] = [];
  const credentialRequests: string[] = [];
  piSorterBridgeRuntime.readSorterIdentity = async () => ({ hardwareId: "SORTER-1", firmwareVersion: "2.14.1" });
  piSorterBridgeRuntime.requestCredential = async (_credential, hardwareId) => {
    credentialRequests.push(hardwareId);
    return { token: "relay-token", deviceGuid: "device-1" };
  };
  piSorterBridgeRuntime.claim = async () => {
    const fake = new FakeSorterPort();
    ports.push(fake);
    return fake;
  };
  piSorterBridgeRuntime.release = (port) => {
    released.push(port as FakeSorterPort);
  };
  piSorterBridgeRuntime.wait = () => new Promise<void>(() => {});

  let scanning = false;
  const bridge = createPiSorterBridge(
    { baseUrl: `http://127.0.0.1:${serverPort}`, token: "mvpi", orgId: "org", hostGuid: "host", hostName: "Pi" },
    () => scanning,
  );
  bridge.start();
  await waitFor(() => connections.length === 1);
  const [{ socket, headers, path }] = connections;
  assert.equal(path, "/sorter-link/device");
  assert.equal(headers.authorization, "Bearer relay-token");
  assert.equal(headers["x-sorter-id"], "SORTER-1");
  assert.equal(headers["x-sorter-firmware"], "2.14.1");
  assert.deepEqual(credentialRequests, ["SORTER-1"]);
  assert.equal(ports.length, 0);

  socket.send('{"getStatus":true,"seq":4}\n');
  await waitFor(() => ports[0]?.written.length === 1);
  assert.deepEqual(ports[0].written, ['{"getStatus":true,"seq":4}\n']);
  const reply = nextMessage(socket);
  ports[0].emit("data", Buffer.from('{"seq":4,"id":"SORTER-1"}\r\n{"seq":5,'));
  assert.equal(await reply, '{"seq":4,"id":"SORTER-1"}\n');

  bridge.releaseForScan();
  assert.deepEqual(released, [ports[0]]);
  scanning = true;
  const busy = nextMessage(socket);
  socket.send('{"route":2,"seq":6}');
  const busyLine = await busy;
  assert.ok(busyLine.endsWith("\n"), "relayed lines end with a newline so the browser's line reader completes them");
  assert.deepEqual(JSON.parse(busyLine), { seq: 6, error: "busy" });
  assert.equal(ports.length, 1);

  bridge.stop();
  server.close();
});
