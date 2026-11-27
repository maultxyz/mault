import { randomUUID } from "node:crypto";
import {
  PI_HOST_CAMERA_CLOSE_REFRESH,
  PI_HOST_STATUS_EVENT,
  type PiHostScanStatus,
  type PiHostStatusEvent,
  type PiHostSummary,
  type PiScanSessionState,
  type PiLinkCameraMessage,
  type PiLinkCommandMessage,
  type PiLinkDeviceMessage,
  type PiLinkCommandAction,
  type PiLinkScanActionResult,
  type PiUpdateStatus,
} from "@magic-vault/shared";
import {
  PI_CAMERA_MAX_BUFFERED_BYTES,
  PI_CAMERA_VIEWER_MAX_MS,
  PI_HOST_OFFLINE_LOCK_RELEASE_MS,
  PI_LINK_CLOSE_REPLACED,
  PI_LINK_CLOSE_REVOKED,
  PI_LINK_COMMAND_TIMEOUT_MS,
  PI_LINK_MAX_MESSAGE_BYTES,
  PI_LINK_OFFLINE_MESSAGE,
  PI_LINK_TIMEOUT_MESSAGE,
} from "./constants/pi-hosts";
import type {
  PiHostTokenRecord,
  PiLinkDeviceConnection,
  PiLinkPendingCommand,
  PiLinkSocket,
  StoredPiHostSummary,
} from "./interfaces/pi-hosts";
import { setPiHostActiveScanUser } from "./pi-hosts";
import { releaseHostScanLockOfOrg } from "./scan-lock";
import { emitToOrg } from "./session-stream";

export const piLinkRelayRuntime = {
  clearActiveScanUser: (host: PiHostTokenRecord) =>
    setPiHostActiveScanUser(host.hostGuid, host.orgId, null),
  emitStatus: (orgId: string, event: PiHostStatusEvent) =>
    emitToOrg(orgId, PI_HOST_STATUS_EVENT, event),
  releaseScanLock: (orgId: string, collectionGuid: string) =>
    releaseHostScanLockOfOrg(collectionGuid, orgId),
};

function publishStatus(orgId: string, hostGuid: string, scanState: PiScanSessionState | null) {
  piLinkRelayRuntime.emitStatus(orgId, {
    hostGuid,
    connected: connections.has(hostGuid),
    scanState,
    update: updateStatuses.get(hostGuid) ?? null,
  });
}

const connections = new Map<string, PiLinkDeviceConnection>();
const updateStatuses = new Map<string, PiUpdateStatus>();
const startingHosts = new Set<string>();
const scanCollections = new Map<string, { orgId: string; collectionGuid: string }>();
const offlineLockTimers = new Map<string, ReturnType<typeof setTimeout>>();
const cameraViewerTimers = new Map<PiLinkSocket, ReturnType<typeof setTimeout>>();

function releaseScanLockOfHost(hostGuid: string) {
  const scan = scanCollections.get(hostGuid);
  if (!scan) return;
  scanCollections.delete(hostGuid);
  piLinkRelayRuntime.releaseScanLock(scan.orgId, scan.collectionGuid);
}

function cancelOfflineLockRelease(hostGuid: string) {
  clearTimeout(offlineLockTimers.get(hostGuid));
  offlineLockTimers.delete(hostGuid);
}

function scheduleOfflineLockRelease(hostGuid: string) {
  cancelOfflineLockRelease(hostGuid);
  if (!scanCollections.has(hostGuid)) return;
  const timer = setTimeout(() => {
    offlineLockTimers.delete(hostGuid);
    if (!connections.has(hostGuid)) releaseScanLockOfHost(hostGuid);
  }, PI_HOST_OFFLINE_LOCK_RELEASE_MS);
  timer.unref();
  offlineLockTimers.set(hostGuid, timer);
}
const cameraViewers = new Map<string, Set<PiLinkSocket>>();
const latestCameraFrames = new Map<string, string>();

function sendCameraWatching(hostGuid: string) {
  const connection = connections.get(hostGuid);
  if (!connection) return;
  const message: PiLinkCameraMessage = {
    type: "camera",
    watching: (cameraViewers.get(hostGuid)?.size ?? 0) > 0,
  };
  connection.socket.send(JSON.stringify(message));
}

export function attachPiCameraViewer(hostGuid: string, viewer: PiLinkSocket) {
  const viewers = cameraViewers.get(hostGuid) ?? new Set<PiLinkSocket>();
  const wasWatched = viewers.size > 0;
  viewers.add(viewer);
  cameraViewers.set(hostGuid, viewers);
  const refresh = setTimeout(
    () => viewer.close(PI_HOST_CAMERA_CLOSE_REFRESH, "Reconnect to keep watching"),
    PI_CAMERA_VIEWER_MAX_MS,
  );
  refresh.unref();
  cameraViewerTimers.set(viewer, refresh);
  const latest = latestCameraFrames.get(hostGuid);
  if (latest) viewer.send(latest);
  if (!wasWatched) sendCameraWatching(hostGuid);
}

export function detachPiCameraViewer(hostGuid: string, viewer: PiLinkSocket) {
  clearTimeout(cameraViewerTimers.get(viewer));
  cameraViewerTimers.delete(viewer);
  const viewers = cameraViewers.get(hostGuid);
  if (!viewers?.delete(viewer)) return;
  if (viewers.size > 0) return;
  cameraViewers.delete(hostGuid);
  latestCameraFrames.delete(hostGuid);
  sendCameraWatching(hostGuid);
}

function forwardCameraFrame(hostGuid: string, image: string) {
  const viewers = cameraViewers.get(hostGuid);
  if (!viewers?.size) return;
  latestCameraFrames.set(hostGuid, image);
  for (const viewer of viewers)
    if ((viewer.raw?.bufferedAmount ?? 0) <= PI_CAMERA_MAX_BUFFERED_BYTES) viewer.send(image);
}
const pendingCommands = new Map<string, PiLinkPendingCommand>();

function offlineResult(message: string): PiLinkScanActionResult {
  return { status: 503, body: { success: false, message } };
}

function settlePendingCommand(id: string, result: PiLinkScanActionResult) {
  const pending = pendingCommands.get(id);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingCommands.delete(id);
  pending.resolve(result);
}

function settleCommandsOfHost(hostGuid: string) {
  for (const [id, pending] of pendingCommands)
    if (pending.hostGuid === hostGuid) settlePendingCommand(id, offlineResult(PI_LINK_OFFLINE_MESSAGE));
}

function clearActiveScanUser(host: PiHostTokenRecord) {
  releaseScanLockOfHost(host.hostGuid);
  piLinkRelayRuntime.clearActiveScanUser(host).catch((error: unknown) =>
    console.error("[pi-link] could not clear the Pi's active scan member:", error),
  );
}

function parseDeviceMessage(raw: unknown): PiLinkDeviceMessage | null {
  if (typeof raw !== "string" || raw.length > PI_LINK_MAX_MESSAGE_BYTES) return null;
  try {
    const message = JSON.parse(raw) as PiLinkDeviceMessage;
    return message && typeof message.type === "string" ? message : null;
  } catch {
    return null;
  }
}

export function attachPiLinkDevice(host: PiHostTokenRecord, socket: PiLinkSocket) {
  const previous = connections.get(host.hostGuid);
  if (previous && previous.socket !== socket)
    previous.socket.close(PI_LINK_CLOSE_REPLACED, "Replaced by a newer connection");
  connections.set(host.hostGuid, { socket, orgId: host.orgId, state: null });
  cancelOfflineLockRelease(host.hostGuid);
  publishStatus(host.orgId, host.hostGuid, null);
  if (cameraViewers.get(host.hostGuid)?.size) sendCameraWatching(host.hostGuid);
}

export function detachPiLinkDevice(hostGuid: string, socket: PiLinkSocket) {
  const connection = connections.get(hostGuid);
  if (connection?.socket !== socket) return;
  connections.delete(hostGuid);
  settleCommandsOfHost(hostGuid);
  scheduleOfflineLockRelease(hostGuid);
  publishStatus(connection.orgId, hostGuid, null);
}

export function receivePiLinkDeviceMessage(host: PiHostTokenRecord, socket: PiLinkSocket, raw: unknown) {
  const connection = connections.get(host.hostGuid);
  if (connection?.socket !== socket) return;
  const message = parseDeviceMessage(raw);
  if (!message) return;
  if (message.type === "reply") {
    if (pendingCommands.get(message.id)?.hostGuid !== host.hostGuid) return;
    settlePendingCommand(message.id, { status: message.status, body: message.body });
    return;
  }
  if (message.type === "state") {
    const isFirstState = connection.state === null;
    connection.state = message.state;
    const scanning = message.state.phase === "running" || message.state.phase === "paused";
    if (scanning && message.state.collectionGuid)
      scanCollections.set(host.hostGuid, { orgId: host.orgId, collectionGuid: message.state.collectionGuid });
    publishStatus(host.orgId, host.hostGuid, message.state);
    if (isFirstState && !message.sessionActive) clearActiveScanUser(host);
    return;
  }
  if (message.type === "update") {
    if (!message.update || typeof message.update !== "object") return;
    updateStatuses.set(host.hostGuid, message.update);
    publishStatus(host.orgId, host.hostGuid, connection.state);
    return;
  }
  if (message.type === "frame") {
    if (typeof message.image === "string") forwardCameraFrame(host.hostGuid, message.image);
    return;
  }
  if (message.type === "ended") clearActiveScanUser(host);
}

export function sendPiLinkCommand(
  hostGuid: string,
  userId: string,
  action: PiLinkCommandAction,
  body?: unknown,
): Promise<PiLinkScanActionResult> {
  const connection = connections.get(hostGuid);
  if (!connection) return Promise.resolve(offlineResult(PI_LINK_OFFLINE_MESSAGE));
  const id = randomUUID();
  const command: PiLinkCommandMessage = { type: "command", id, userId, action, body };
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => settlePendingCommand(id, offlineResult(PI_LINK_TIMEOUT_MESSAGE)),
      PI_LINK_COMMAND_TIMEOUT_MS,
    );
    pendingCommands.set(id, { hostGuid, resolve, timer });
    connection.socket.send(JSON.stringify(command));
  });
}

export function beginPiHostScanStart(hostGuid: string): boolean {
  if (startingHosts.has(hostGuid)) return false;
  startingHosts.add(hostGuid);
  return true;
}

export function endPiHostScanStart(hostGuid: string) {
  startingHosts.delete(hostGuid);
}

export function piHostScanStatus(hostGuid: string): PiHostScanStatus {
  const connection = connections.get(hostGuid);
  return { connected: !!connection, state: connection?.state ?? null };
}

export function withPiHostLiveStatus(hosts: StoredPiHostSummary[]): PiHostSummary[] {
  return hosts.map((host) => {
    const connection = connections.get(host.guid);
    return {
      ...host,
      connected: !!connection,
      scanState: connection?.state ?? null,
      update: updateStatuses.get(host.guid) ?? null,
    };
  });
}

export function disconnectPiLinkDevice(hostGuid: string) {
  const connection = connections.get(hostGuid);
  if (!connection) return;
  connections.delete(hostGuid);
  updateStatuses.delete(hostGuid);
  settleCommandsOfHost(hostGuid);
  connection.socket.close(PI_LINK_CLOSE_REVOKED, "Pi unlinked");
  publishStatus(connection.orgId, hostGuid, null);
}
