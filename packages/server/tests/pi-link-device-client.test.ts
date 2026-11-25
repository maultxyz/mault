import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PiLinkDeviceMessage } from "@magic-vault/shared";
import { WebSocketServer, type WebSocket } from "ws";
import { PI_LINK_CLOSE_REVOKED } from "../src/lib/constants/pi-hosts";
import { piLinkCredentialRuntime } from "../src/lib/pi-link-device/credential";
import { piLinkPairingRuntime } from "../src/lib/pi-link-device/pairing";

function nextMessage(socket: WebSocket): Promise<PiLinkDeviceMessage> {
  return new Promise((resolve) =>
    socket.once("message", (data) => resolve(JSON.parse(data.toString()) as PiLinkDeviceMessage)),
  );
}

async function waitFor(check: () => boolean | Promise<boolean>) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for the Pi link.");
}

test("a linked Pi connects with its token, runs commands and pairs again once unlinked", async () => {
  const stateDirectory = await mkdtemp(join(tmpdir(), "mault-pi-link-"));
  const credentialPath = join(stateDirectory, "pi-link.json");
  piLinkCredentialRuntime.path = () => credentialPath;
  const pairingRequests: string[] = [];
  piLinkPairingRuntime.fetch = (url) => {
    pairingRequests.push(url);
    return new Promise<Response>(() => {});
  };

  const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const connections: { socket: WebSocket; authorization?: string; path?: string }[] = [];
  server.on("connection", (socket, request) =>
    connections.push({ socket, authorization: request.headers.authorization, path: request.url }),
  );

  await mkdir(stateDirectory, { recursive: true });
  await writeFile(
    credentialPath,
    JSON.stringify({ baseUrl, token: "mvpi_test", orgId: "org-link", hostGuid: "host-1", hostName: "Bench Pi" }),
  );
  process.env.PI_HOST = "1";
  process.env.MAULT_LINK_URL = `${baseUrl}/`;
  const { piLinkLocalStatus, startPiLinkDevice } = await import("../src/lib/pi-link-device/client");

  const firstStateArrived = new Promise<PiLinkDeviceMessage>((resolve) =>
    server.once("connection", (socket) => void nextMessage(socket).then(resolve)),
  );
  startPiLinkDevice();
  const firstState = await firstStateArrived;
  const [{ socket, authorization, path }] = connections;
  assert.equal(authorization, "Bearer mvpi_test");
  assert.equal(path, "/pi-link/device/commands");
  assert.equal(firstState.type, "state");
  assert.equal(firstState.type === "state" && firstState.sessionActive, false);
  await waitFor(() => {
    const status = piLinkLocalStatus();
    return status.state === "linked" && status.connected;
  });

  const reply = nextMessage(socket);
  socket.send(JSON.stringify({ type: "command", id: "c1", userId: "user-1", action: "pause" }));
  assert.deepEqual(await reply, {
    type: "reply",
    id: "c1",
    status: 409,
    body: { success: false, message: "No scan is running." },
  });

  socket.close(PI_LINK_CLOSE_REVOKED, "Pi unlinked");
  await waitFor(() => pairingRequests.length > 0);
  assert.equal(pairingRequests[0], `${baseUrl}/public/pi-link/pairings`);
  await assert.rejects(readFile(credentialPath, "utf8"));
  assert.equal(piLinkLocalStatus().state, "pairing");
  server.close();
});
