import assert from "node:assert/strict";
import { test } from "node:test";
import type { PiLinkCommandMessage, PiScanSessionState } from "@magic-vault/shared";
import { PI_LINK_CLOSE_REPLACED, PI_LINK_CLOSE_REVOKED } from "../src/lib/constants/pi-hosts";
import type { PiHostTokenRecord, PiLinkSocket } from "../src/lib/interfaces/pi-hosts";
import {
  attachPiCameraViewer,
  attachPiLinkDevice,
  beginPiHostScanStart,
  detachPiCameraViewer,
  endPiHostScanStart,
  detachPiLinkDevice,
  disconnectPiLinkDevice,
  piHostScanStatus,
  piLinkRelayRuntime,
  receivePiLinkDeviceMessage,
  sendPiLinkCommand,
  withPiHostLiveStatus,
} from "../src/lib/pi-link-relay";

function fakeHost(hostGuid: string): PiHostTokenRecord {
  return { id: 1, hostGuid, orgId: "org-1", name: "Pi", lastSeenAt: null, activeScanUserId: null };
}

function fakeSocket() {
  const sent: string[] = [];
  const closed: number[] = [];
  const socket = {
    send: (data: string) => sent.push(data),
    close: (code: number) => closed.push(code),
  } as unknown as PiLinkSocket;
  return { socket, sent, closed };
}

const idleState = { phase: "idle", stopping: false } as unknown as PiScanSessionState;

piLinkRelayRuntime.emitStatus = () => {};
piLinkRelayRuntime.releaseScanLock = () => true;

function trackClears() {
  const cleared: string[] = [];
  piLinkRelayRuntime.clearActiveScanUser = async (host) => {
    cleared.push(host.hostGuid);
  };
  return cleared;
}

test("a command reaches the Pi and its reply resolves the request", async () => {
  const host = fakeHost("host-reply");
  const { socket, sent } = fakeSocket();
  attachPiLinkDevice(host, socket);
  const pending = sendPiLinkCommand(host.hostGuid, "user-1", "pause");
  const command = JSON.parse(sent[0]) as PiLinkCommandMessage;
  assert.equal(command.action, "pause");
  assert.equal(command.userId, "user-1");
  receivePiLinkDeviceMessage(
    host,
    socket,
    JSON.stringify({ type: "reply", id: command.id, status: 409, body: { success: false, message: "No scan is running." } }),
  );
  assert.deepEqual(await pending, {
    status: 409,
    body: { success: false, message: "No scan is running." },
  });
  detachPiLinkDevice(host.hostGuid, socket);
});

test("an offline Pi answers 503 and a dropped connection settles waiting commands", async () => {
  const offline = await sendPiLinkCommand("host-missing", "user-1", "stop");
  assert.equal(offline.status, 503);
  const host = fakeHost("host-drop");
  const { socket } = fakeSocket();
  attachPiLinkDevice(host, socket);
  const pending = sendPiLinkCommand(host.hostGuid, "user-1", "stop");
  detachPiLinkDevice(host.hostGuid, socket);
  assert.equal((await pending).status, 503);
  assert.equal(piHostScanStatus(host.hostGuid).connected, false);
});

test("replies from another Pi or an old connection are ignored", async () => {
  const host = fakeHost("host-own");
  const other = fakeHost("host-other");
  const first = fakeSocket();
  const second = fakeSocket();
  attachPiLinkDevice(host, first.socket);
  attachPiLinkDevice(other, second.socket);
  const pending = sendPiLinkCommand(host.hostGuid, "user-1", "feed");
  const { id } = JSON.parse(first.sent[0]) as PiLinkCommandMessage;
  const forged = JSON.stringify({ type: "reply", id, status: 200, body: { success: true } });
  receivePiLinkDeviceMessage(other, second.socket, forged);
  const replacement = fakeSocket();
  attachPiLinkDevice(host, replacement.socket);
  assert.deepEqual(first.closed, [PI_LINK_CLOSE_REPLACED]);
  receivePiLinkDeviceMessage(host, first.socket, forged);
  receivePiLinkDeviceMessage(host, replacement.socket, forged);
  assert.equal((await pending).status, 200);
  disconnectPiLinkDevice(host.hostGuid);
  disconnectPiLinkDevice(other.hostGuid);
});

test("the active scan member is cleared when a reconnecting Pi has no session or a session ends", () => {
  const cleared = trackClears();
  const host = fakeHost("host-state");
  const { socket } = fakeSocket();
  attachPiLinkDevice(host, socket);
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "state", state: idleState, sessionActive: false }));
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "state", state: idleState, sessionActive: false }));
  assert.deepEqual(cleared, ["host-state"]);
  assert.deepEqual(piHostScanStatus(host.hostGuid), { connected: true, state: idleState });
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "ended" }));
  assert.deepEqual(cleared, ["host-state", "host-state"]);
  receivePiLinkDeviceMessage(host, socket, "not json");
  detachPiLinkDevice(host.hostGuid, socket);
});

test("a Pi that is still scanning after reconnecting keeps its active member", () => {
  const cleared = trackClears();
  const host = fakeHost("host-busy");
  const { socket } = fakeSocket();
  attachPiLinkDevice(host, socket);
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "state", state: idleState, sessionActive: true }));
  assert.deepEqual(cleared, []);
  detachPiLinkDevice(host.hostGuid, socket);
});

test("connecting, reporting state and disconnecting publish the Pi's status to its org", () => {
  const published: { orgId: string; hostGuid: string; connected: boolean; phase: string | null }[] = [];
  piLinkRelayRuntime.emitStatus = (orgId, event) =>
    published.push({ orgId, hostGuid: event.hostGuid, connected: event.connected, phase: event.scanState?.phase ?? null });
  trackClears();
  const host = fakeHost("host-events");
  const { socket } = fakeSocket();
  attachPiLinkDevice(host, socket);
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "state", state: idleState, sessionActive: false }));
  detachPiLinkDevice(host.hostGuid, socket);
  assert.deepEqual(published, [
    { orgId: "org-1", hostGuid: "host-events", connected: true, phase: null },
    { orgId: "org-1", hostGuid: "host-events", connected: true, phase: "idle" },
    { orgId: "org-1", hostGuid: "host-events", connected: false, phase: null },
  ]);
});

test("the Pi list carries each Pi's live connection and scan state", () => {
  const host = fakeHost("host-listed");
  const { socket } = fakeSocket();
  attachPiLinkDevice(host, socket);
  receivePiLinkDeviceMessage(host, socket, JSON.stringify({ type: "state", state: idleState, sessionActive: true }));
  const stored = { name: "Pi", pairedAt: "2026-11-25T00:00:00.000Z", lastSeenAt: null };
  assert.deepEqual(
    withPiHostLiveStatus([{ guid: "host-listed", ...stored }, { guid: "host-unknown", ...stored }]).map(
      ({ guid, connected, scanState }) => ({ guid, connected, scanState }),
    ),
    [
      { guid: "host-listed", connected: true, scanState: idleState },
      { guid: "host-unknown", connected: false, scanState: null },
    ],
  );
  detachPiLinkDevice(host.hostGuid, socket);
});

test("the first camera viewer starts the Pi's feed, frames reach every viewer and the last one stops it", () => {
  const host = fakeHost("host-camera");
  const pi = fakeSocket();
  attachPiLinkDevice(host, pi.socket);
  const first = fakeSocket();
  const second = fakeSocket();
  attachPiCameraViewer(host.hostGuid, first.socket);
  attachPiCameraViewer(host.hostGuid, second.socket);
  receivePiLinkDeviceMessage(host, pi.socket, JSON.stringify({ type: "frame", image: "frame-1" }));
  const late = fakeSocket();
  attachPiCameraViewer(host.hostGuid, late.socket);
  detachPiCameraViewer(host.hostGuid, first.socket);
  detachPiCameraViewer(host.hostGuid, second.socket);
  detachPiCameraViewer(host.hostGuid, late.socket);
  assert.deepEqual(pi.sent.map((message) => JSON.parse(message)), [
    { type: "camera", watching: true },
    { type: "camera", watching: false },
  ]);
  assert.deepEqual(first.sent, ["frame-1"]);
  assert.deepEqual(second.sent, ["frame-1"]);
  assert.deepEqual(late.sent, ["frame-1"]);
  receivePiLinkDeviceMessage(host, pi.socket, JSON.stringify({ type: "frame", image: "frame-2" }));
  assert.deepEqual(first.sent, ["frame-1"]);
  disconnectPiLinkDevice(host.hostGuid);
});

test("a Pi that reconnects while someone watches is asked for frames again", () => {
  const host = fakeHost("host-camera-reconnect");
  const viewer = fakeSocket();
  attachPiCameraViewer(host.hostGuid, viewer.socket);
  const pi = fakeSocket();
  attachPiLinkDevice(host, pi.socket);
  assert.deepEqual(pi.sent.map((message) => JSON.parse(message)), [{ type: "camera", watching: true }]);
  detachPiCameraViewer(host.hostGuid, viewer.socket);
  disconnectPiLinkDevice(host.hostGuid);
});

test("a Pi that comes back without its scan releases the collection it had locked", () => {
  const released: string[] = [];
  piLinkRelayRuntime.releaseScanLock = (orgId, collectionGuid) => {
    released.push(`${orgId}:${collectionGuid}`);
    return true;
  };
  trackClears();
  const host = fakeHost("host-lock");
  const first = fakeSocket();
  attachPiLinkDevice(host, first.socket);
  const scanning = { ...idleState, phase: "running", collectionGuid: "collection-9" };
  receivePiLinkDeviceMessage(host, first.socket, JSON.stringify({ type: "state", state: scanning, sessionActive: true }));
  detachPiLinkDevice(host.hostGuid, first.socket);
  assert.deepEqual(released, []);
  const second = fakeSocket();
  attachPiLinkDevice(host, second.socket);
  receivePiLinkDeviceMessage(host, second.socket, JSON.stringify({ type: "state", state: idleState, sessionActive: false }));
  assert.deepEqual(released, ["org-1:collection-9"]);
  receivePiLinkDeviceMessage(host, second.socket, JSON.stringify({ type: "ended" }));
  assert.deepEqual(released, ["org-1:collection-9"]);
  detachPiLinkDevice(host.hostGuid, second.socket);
});

test("only one member can be starting a scan on a Pi at a time", () => {
  assert.equal(beginPiHostScanStart("host-start"), true);
  assert.equal(beginPiHostScanStart("host-start"), false);
  assert.equal(beginPiHostScanStart("host-other-start"), true);
  endPiHostScanStart("host-start");
  endPiHostScanStart("host-other-start");
  assert.equal(beginPiHostScanStart("host-start"), true);
  endPiHostScanStart("host-start");
});

test("a viewer whose connection is backed up is skipped until it catches up", () => {
  const host = fakeHost("host-slow-viewer");
  const pi = fakeSocket();
  attachPiLinkDevice(host, pi.socket);
  const slow = fakeSocket();
  (slow.socket as unknown as { raw: { bufferedAmount: number } }).raw = { bufferedAmount: 10 * 1024 * 1024 };
  const fast = fakeSocket();
  attachPiCameraViewer(host.hostGuid, slow.socket);
  attachPiCameraViewer(host.hostGuid, fast.socket);
  receivePiLinkDeviceMessage(host, pi.socket, JSON.stringify({ type: "frame", image: "frame-1" }));
  assert.deepEqual(slow.sent, []);
  assert.deepEqual(fast.sent, ["frame-1"]);
  detachPiCameraViewer(host.hostGuid, slow.socket);
  detachPiCameraViewer(host.hostGuid, fast.socket);
  disconnectPiLinkDevice(host.hostGuid);
});

test("unlinking closes the Pi's connection as revoked", () => {
  const host = fakeHost("host-revoke");
  const { socket, closed } = fakeSocket();
  attachPiLinkDevice(host, socket);
  disconnectPiLinkDevice(host.hostGuid);
  assert.deepEqual(closed, [PI_LINK_CLOSE_REVOKED]);
  assert.equal(piHostScanStatus(host.hostGuid).connected, false);
});
