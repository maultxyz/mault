import { hostname } from "node:os";
import {
  PI_LINK_COMMANDS_SEGMENT,
  PI_LINK_DEVICE_ACTIONS,
  PI_LINK_DEVICE_PATH,
  PI_LINK_SCAN_ACTIONS,
  type PiLinkCommandAction,
  type PiLinkCommandMessage,
  type PiLinkDeviceMessage,
  type PiLinkServerMessage,
  type PiLinkLocalStatus,
  type PiLinkScanActionResult,
  type PiUpdateState,
  type PiUpdateStatus,
} from "@magic-vault/shared";
import WebSocket from "ws";
import {
  PI_CAMERA_MAX_BUFFERED_BYTES,
  PI_LINK_CLOSE_REVOKED,
  PI_LINK_DEVICE_RECONNECT_MAX_MS,
  PI_LINK_DEVICE_RECONNECT_MIN_MS,
  PI_LINK_DEVICE_STATE_INTERVAL_MS,
  PI_LINK_DEVICE_URL_ENV,
  PI_LINK_MAX_MESSAGE_BYTES,
  PI_LINK_UPDATE_FAILED_MESSAGE,
  PI_LINK_UPDATE_REQUEST_GRACE_MS,
  PI_LINK_UPDATE_STATUS_INTERVAL_MS,
} from "../constants/pi-hosts";
import type { PiLinkDeviceCredential } from "../interfaces/pi-hosts";
import { isPiHost } from "../pi-host";
import { getPiUpdateStatus, startPiUpdate } from "../pi-update";
import { runPiScanAction } from "../pi-scan/actions";
import { setPiScanApi } from "../pi-scan/api";
import { createRemotePiScanApi } from "../pi-scan/remote-api";
import { getPiScanSession, piScanSessionDone } from "../pi-scan/session";
import {
  deletePiLinkCredential,
  readPiLinkCredential,
  writePiLinkCredential,
} from "./credential";
import { createPiLinkCameraFeed } from "./camera";
import { pairPiLink } from "./pairing";
import { isSecureOrLocalUrl } from "./link-url";
import { createPiSorterBridge } from "./sorter-bridge";

let localStatus: PiLinkLocalStatus = { state: "off" };
let sessionActive = false;
let scanStarting = false;
let currentSocket: WebSocket | null = null;
let sorterBridge: ReturnType<typeof createPiSorterBridge> | null = null;
let requestedUpdate: { state: PiUpdateState; at: number } | null = null;

export function piLinkLocalStatus(): PiLinkLocalStatus {
  return localStatus;
}

export function piLinkBaseUrl(): string | null {
  const configured = process.env[PI_LINK_DEVICE_URL_ENV]?.trim();
  if (!configured) return null;
  if (!isSecureOrLocalUrl(configured)) {
    console.error(`[pi-link] ${PI_LINK_DEVICE_URL_ENV} must use https unless it points at this network.`);
    return null;
  }
  return configured.replace(/\/+$/, "");
}

export function piLinkAppUrl(): string | null {
  return piLinkBaseUrl()?.replace(/\/api$/, "") ?? null;
}

function commandSocketUrl(baseUrl: string): string {
  return `${baseUrl.replace(/^http/i, "ws")}${PI_LINK_DEVICE_PATH}${PI_LINK_COMMANDS_SEGMENT}`;
}

function scanActorClaims(orgId: string, userId: string): string {
  return JSON.stringify({ sub: userId, role: "authenticated", org_id: orgId });
}

function sendToServer(socket: WebSocket, message: PiLinkDeviceMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function isCommand(message: Partial<PiLinkCommandMessage>): message is PiLinkCommandMessage {
  return (
    message.type === "command" &&
    typeof message.id === "string" &&
    typeof message.userId === "string" &&
    ([...PI_LINK_SCAN_ACTIONS, ...PI_LINK_DEVICE_ACTIONS] as PiLinkCommandAction[]).includes(message.action!)
  );
}

function parseServerMessage(raw: string): PiLinkServerMessage | null {
  if (raw.length > PI_LINK_MAX_MESSAGE_BYTES) return null;
  try {
    const message = JSON.parse(raw) as Partial<PiLinkServerMessage>;
    if (message.type === "camera") return typeof message.watching === "boolean" ? (message as PiLinkServerMessage) : null;
    return isCommand(message as Partial<PiLinkCommandMessage>) ? (message as PiLinkCommandMessage) : null;
  } catch {
    return null;
  }
}

function followSession(orgId: string) {
  const done = piScanSessionDone(orgId);
  if (!done) return;
  sessionActive = true;
  void done.then(() => {
    if (piScanSessionDone(orgId) !== done) return;
    sessionActive = false;
    if (currentSocket) sendToServer(currentSocket, { type: "ended" });
  });
}

async function currentPiUpdateStatus(): Promise<PiUpdateStatus | null> {
  const status = await getPiUpdateStatus().catch(() => null);
  if (!status) return null;
  const requested =
    requestedUpdate && Date.now() - requestedUpdate.at < PI_LINK_UPDATE_REQUEST_GRACE_MS
      ? requestedUpdate.state
      : null;
  return requested && status.state.phase !== "running" ? { ...status, state: requested } : status;
}

async function runUpdateCommand(): Promise<PiLinkScanActionResult> {
  try {
    const state = await startPiUpdate(sessionActive || scanStarting ? 1 : 0);
    requestedUpdate = { state, at: Date.now() };
    return { status: 202, body: { success: true } };
  } catch (error) {
    return {
      status: 409,
      body: {
        success: false,
        message: error instanceof Error ? error.message : PI_LINK_UPDATE_FAILED_MESSAGE,
      },
    };
  }
}

async function runCommand(
  credential: PiLinkDeviceCredential,
  command: PiLinkCommandMessage,
): Promise<PiLinkScanActionResult> {
  if (command.action === "update") return runUpdateCommand();
  const isStart = command.action === "start";
  if (isStart) {
    scanStarting = true;
    sorterBridge?.releaseForScan();
  }
  try {
    const result = await runPiScanAction(
      {
        orgId: credential.orgId,
        userId: command.userId,
        jwtClaims: scanActorClaims(credential.orgId, command.userId),
      },
      command.action,
      command.body,
    );
    if (command.action === "start" && result.body.success) followSession(credential.orgId);
    return result;
  } catch (error) {
    console.error(`[pi-link] ${command.action} command failed:`, error);
    return { status: 500, body: { success: false, message: "The Pi could not run that command." } };
  } finally {
    if (isStart) scanStarting = false;
  }
}

function connectCommandSocket(credential: PiLinkDeviceCredential): Promise<"revoked"> {
  return new Promise((resolve) => {
    let reconnectDelay = PI_LINK_DEVICE_RECONNECT_MIN_MS;
    const connect = () => {
      const socket = new WebSocket(commandSocketUrl(credential.baseUrl), {
        headers: { Authorization: `Bearer ${credential.token}` },
      });
      let stateTimer: ReturnType<typeof setInterval> | null = null;
      const cameraFeed = createPiLinkCameraFeed(
        (image) => sendToServer(socket, { type: "frame", image }),
        () => getPiScanSession(credential.orgId).cameraId,
        {
          isBackedUp: () => socket.bufferedAmount > PI_CAMERA_MAX_BUFFERED_BYTES,
          isScanning: () => sessionActive,
        },
      );
      let lastSentState = "";
      let lastSentUpdate = "";
      let updateTimer: ReturnType<typeof setInterval> | null = null;
      const sendUpdate = async (force: boolean) => {
        const update = await currentPiUpdateStatus();
        if (!update) return;
        const serialized = JSON.stringify(update);
        if (!force && serialized === lastSentUpdate) return;
        lastSentUpdate = serialized;
        sendToServer(socket, { type: "update", update });
      };
      let finished = false;
      const sendState = (force: boolean) => {
        const state = getPiScanSession(credential.orgId);
        const serialized = JSON.stringify(state);
        if (!force && serialized === lastSentState) return;
        lastSentState = serialized;
        sendToServer(socket, { type: "state", state, sessionActive });
      };
      const finish = (revoked: boolean) => {
        if (finished) return;
        finished = true;
        if (stateTimer) clearInterval(stateTimer);
        if (updateTimer) clearInterval(updateTimer);
        cameraFeed.stop();
        if (currentSocket === socket) currentSocket = null;
        if (localStatus.state === "linked") localStatus = { ...localStatus, connected: false };
        if (revoked) {
          resolve("revoked");
          return;
        }
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, PI_LINK_DEVICE_RECONNECT_MAX_MS);
      };
      socket.on("unexpected-response", (request, response) => {
        request.destroy();
        finish(response.statusCode === 401);
      });
      socket.on("open", () => {
        reconnectDelay = PI_LINK_DEVICE_RECONNECT_MIN_MS;
        currentSocket = socket;
        if (localStatus.state === "linked") localStatus = { ...localStatus, connected: true };
        sendState(true);
        stateTimer = setInterval(() => sendState(false), PI_LINK_DEVICE_STATE_INTERVAL_MS);
        void sendUpdate(true);
        updateTimer = setInterval(() => void sendUpdate(false), PI_LINK_UPDATE_STATUS_INTERVAL_MS);
      });
      socket.on("message", (data) => {
        const message = parseServerMessage(data.toString());
        if (!message) return;
        if (message.type === "camera") {
          cameraFeed.setWatching(message.watching);
          return;
        }
        const command = message;
        void runCommand(credential, command).then((result) => {
          sendToServer(socket, { type: "reply", id: command.id, ...result });
          sendState(false);
          if (command.action === "update") void sendUpdate(true);
        });
      });
      socket.on("close", (code) => finish(code === PI_LINK_CLOSE_REVOKED));
      socket.on("error", (error) => {
        console.warn("[pi-link] command connection error:", error.message);
        finish(false);
      });
    };
    connect();
  });
}

async function linkedCredential(baseUrl: string): Promise<PiLinkDeviceCredential> {
  const saved = await readPiLinkCredential();
  if (saved?.baseUrl === baseUrl) return saved;
  localStatus = { state: "pairing", code: null, expiresAt: null };
  const credential = await pairPiLink(baseUrl, hostname(), (pairing) => {
    localStatus = { state: "pairing", code: pairing.code, expiresAt: pairing.expiresAt };
  });
  await writePiLinkCredential(credential);
  console.log(`[pi-link] Linked as "${credential.hostName}".`);
  return credential;
}

async function runPiLinkDevice(baseUrl: string) {
  for (;;) {
    const credential = await linkedCredential(baseUrl);
    setPiScanApi(createRemotePiScanApi({ baseUrl, token: credential.token }));
    localStatus = { state: "linked", hostName: credential.hostName, connected: false };
    sorterBridge = createPiSorterBridge(credential, () => sessionActive || scanStarting);
    sorterBridge.start();
    await connectCommandSocket(credential);
    sorterBridge.stop();
    sorterBridge = null;
    console.warn("[pi-link] This Pi was unlinked. Pair it again to keep scanning.");
    await deletePiLinkCredential();
  }
}

export function startPiLinkDevice() {
  const baseUrl = piLinkBaseUrl();
  if (!baseUrl || !isPiHost()) return;
  runPiLinkDevice(baseUrl).catch((error: unknown) =>
    console.error("[pi-link] the Pi link stopped:", error),
  );
}
