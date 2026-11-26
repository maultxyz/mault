import { SORTER_LINK_DEVICE_PATH } from "@magic-vault/shared";
import WebSocket from "ws";
import {
  PI_LINK_DEVICE_RECONNECT_MAX_MS,
  PI_LINK_DEVICE_RECONNECT_MIN_MS,
  PI_SORTER_BRIDGE_BUSY_ERROR,
  PI_SORTER_BRIDGE_IDENTITY_ATTEMPTS,
  PI_SORTER_BRIDGE_IDLE_MS,
  PI_SORTER_BRIDGE_PATH,
  PI_SORTER_BRIDGE_RETRY_MAX_MS,
  PI_SORTER_BRIDGE_RETRY_MS,
} from "../constants/pi-hosts";
import { PI_SCAN_PORT_DRAIN_MS, PI_SCAN_STATUS_TIMEOUT_MS } from "../constants/pi-scan";
import { PI_LINK_REQUEST_TIMEOUT_MS } from "../constants/scan-host";
import { SORTER_FIRMWARE_HEADER, SORTER_ID_HEADER } from "../constants/sorter-link";
import type { PiLinkDeviceCredential, PiSorterBridgeCredential } from "../interfaces/pi-hosts";
import type { SorterPort } from "../interfaces/pi-serial";
import { claimSorterPort, releaseSorterPort } from "../pi-serial-port";
import { SorterLink } from "../pi-scan/sorter-link";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const piSorterBridgeRuntime = {
  claim: () => claimSorterPort("bridge"),
  release: (port: SorterPort) => releaseSorterPort("bridge", port),
  async readSorterIdentity(): Promise<{ hardwareId: string; firmwareVersion: string | null } | null> {
    const port = await claimSorterPort("bridge").catch(() => null);
    if (!port) return null;
    try {
      await wait(PI_SCAN_PORT_DRAIN_MS);
      const link = new SorterLink(port);
      for (let attempt = 0; attempt < PI_SORTER_BRIDGE_IDENTITY_ATTEMPTS; attempt++) {
        const status = await link.command({ getStatus: true }, PI_SCAN_STATUS_TIMEOUT_MS).catch(() => null);
        const hardwareId = typeof status?.id === "string" ? status.id.trim().toUpperCase() : "";
        if (hardwareId) return { hardwareId, firmwareVersion: link.firmwareVersion };
      }
      return null;
    } catch {
      return null;
    } finally {
      releaseSorterPort("bridge", port);
    }
  },
  async requestCredential(
    credential: PiLinkDeviceCredential,
    hardwareId: string,
  ): Promise<PiSorterBridgeCredential | null> {
    const response = await fetch(`${credential.baseUrl}/pi-link/device${PI_SORTER_BRIDGE_PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credential.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hardwareId }),
      signal: AbortSignal.timeout(PI_LINK_REQUEST_TIMEOUT_MS),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      data?: PiSorterBridgeCredential;
      message?: string;
    } | null;
    if (!response?.ok) {
      if (body?.message) console.warn(`[pi-link] sorter bridge refused: ${body.message}`);
      return null;
    }
    return body?.data ?? null;
  },
  openSocket: (url: string, headers: Record<string, string>) => new WebSocket(url, { headers }),
  wait,
};

function busyReply(line: string): string {
  let seq: unknown;
  try {
    seq = (JSON.parse(line) as { seq?: unknown }).seq;
  } catch {
    seq = undefined;
  }
  return JSON.stringify(seq === undefined ? { error: PI_SORTER_BRIDGE_BUSY_ERROR } : { seq, error: PI_SORTER_BRIDGE_BUSY_ERROR });
}

export function createPiSorterBridge(credential: PiLinkDeviceCredential, isScanActive: () => boolean) {
  let stopped = false;
  let port: SorterPort | null = null;
  let socket: WebSocket | null = null;
  let portLines = "";
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  function releasePort() {
    clearTimeout(idleTimer);
    const current = port;
    port = null;
    portLines = "";
    if (current) piSorterBridgeRuntime.release(current);
  }

  function sendToRelay(text: string) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(`${text}\n`);
  }

  async function claimPort(): Promise<SorterPort | null> {
    if (port) return port;
    const claimed = await piSorterBridgeRuntime.claim().catch(() => null);
    if (!claimed) return null;
    port = claimed;
    claimed.on("data", (chunk: Buffer | string) => {
      portLines += chunk.toString();
      const lines = portLines.split("\n");
      portLines = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.replace(/\r$/, "");
        if (trimmed.trim()) sendToRelay(trimmed);
      }
    });
    claimed.on("close", () => {
      if (port === claimed) port = null;
    });
    return claimed;
  }

  async function forwardFromBrowser(text: string) {
    for (const line of text.split("\n").map((part) => part.trim()).filter(Boolean)) {
      const target = isScanActive() ? null : await claimPort();
      if (!target) {
        sendToRelay(busyReply(line));
        continue;
      }
      target.write(`${line}\n`);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(releasePort, PI_SORTER_BRIDGE_IDLE_MS);
    }
  }

  function connect(bridge: PiSorterBridgeCredential, identity: { hardwareId: string; firmwareVersion: string | null }) {
    return new Promise<number>((resolve) => {
      const url = `${credential.baseUrl.replace(/^http/i, "ws")}${SORTER_LINK_DEVICE_PATH}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${bridge.token}`,
        [SORTER_ID_HEADER]: identity.hardwareId,
      };
      if (identity.firmwareVersion) headers[SORTER_FIRMWARE_HEADER] = identity.firmwareVersion;
      const next = piSorterBridgeRuntime.openSocket(url, headers);
      socket = next;
      let finished = false;
      const finish = (code: number) => {
        if (finished) return;
        finished = true;
        if (socket === next) socket = null;
        releasePort();
        resolve(code);
      };
      next.on("message", (data) => void forwardFromBrowser(data.toString()));
      next.on("unexpected-response", (request, response) => {
        request.destroy();
        finish(response.statusCode ?? 0);
      });
      next.on("close", (code) => finish(code));
      next.on("error", () => finish(0));
    });
  }

  async function run() {
    let reconnectDelay = PI_LINK_DEVICE_RECONNECT_MIN_MS;
    let bridge: PiSorterBridgeCredential | null = null;
    let identity: { hardwareId: string; firmwareVersion: string | null } | null = null;
    let setupRetryDelay = PI_SORTER_BRIDGE_RETRY_MS;
    let reportedUnreadableSorter = false;
    const waitBeforeSetupRetry = async () => {
      await piSorterBridgeRuntime.wait(setupRetryDelay);
      setupRetryDelay = Math.min(setupRetryDelay * 2, PI_SORTER_BRIDGE_RETRY_MAX_MS);
    };
    while (!stopped) {
      if (!identity && isScanActive()) {
        await piSorterBridgeRuntime.wait(PI_SORTER_BRIDGE_RETRY_MS);
        continue;
      }
      identity ??= await piSorterBridgeRuntime.readSorterIdentity();
      if (!identity) {
        if (!reportedUnreadableSorter) {
          reportedUnreadableSorter = true;
          console.warn("[pi-link] Couldn't read the sorter's id; retrying. Check that the sorter or controller is connected.");
        }
        await waitBeforeSetupRetry();
        continue;
      }
      reportedUnreadableSorter = false;
      bridge ??= await piSorterBridgeRuntime.requestCredential(credential, identity.hardwareId);
      if (!bridge) {
        await waitBeforeSetupRetry();
        continue;
      }
      setupRetryDelay = PI_SORTER_BRIDGE_RETRY_MS;
      const opened = Date.now();
      const code = await connect(bridge, identity);
      if (stopped) return;
      if (code === 401 || code === 403) {
        bridge = null;
        identity = null;
      }
      if (Date.now() - opened > PI_LINK_DEVICE_RECONNECT_MAX_MS) reconnectDelay = PI_LINK_DEVICE_RECONNECT_MIN_MS;
      await piSorterBridgeRuntime.wait(reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, PI_LINK_DEVICE_RECONNECT_MAX_MS);
    }
  }

  return {
    start() {
      run().catch((error: unknown) => console.error("[pi-link] the sorter bridge stopped:", error));
    },
    releaseForScan: releasePort,
    stop() {
      stopped = true;
      socket?.close();
      releasePort();
    },
  };
}
