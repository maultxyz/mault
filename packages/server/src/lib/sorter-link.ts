import {
  SORTER_LINK_CLOSE_OFFLINE,
  SORTER_LINK_CLOSE_REPLACED,
  SORTER_LINK_READY_KEY,
  SORTER_LINK_READY_VALUE,
  type SorterLinkStatus,
} from "@magic-vault/shared";
import { createHash, randomBytes } from "node:crypto";
import {
  SORTER_LINK_MAX_MISSED_PONGS,
  SORTER_LINK_PING_INTERVAL_MS,
  SORTER_LINK_TOKEN_BYTES,
  SORTER_LINK_TOKEN_PREFIX,
} from "./constants/sorter-link";
import type {
  AttachClientResult,
  DeviceLink,
  SorterLinkSocket,
  SorterLinkTarget,
} from "./interfaces/sorter-link";

const links = new Map<string, DeviceLink>();

export function hashSorterLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSorterLinkToken(): string {
  return `${SORTER_LINK_TOKEN_PREFIX}${randomBytes(SORTER_LINK_TOKEN_BYTES).toString("base64url")}`;
}

function keepAlive(socket: SorterLinkSocket): () => void {
  const raw = socket.raw;
  if (!raw) return () => {};
  let missed = 0;
  const onPong = () => {
    missed = 0;
  };
  raw.on("pong", onPong);
  const timer = setInterval(() => {
    if (missed >= SORTER_LINK_MAX_MISSED_PONGS) {
      raw.terminate();
      return;
    }
    missed += 1;
    raw.ping();
  }, SORTER_LINK_PING_INTERVAL_MS);
  return () => {
    clearInterval(timer);
    raw.off("pong", onPong);
  };
}

export function attachDevice(
  target: SorterLinkTarget,
  socket: SorterLinkSocket,
) {
  const previous = links.get(target.deviceGuid);
  if (previous) {
    previous.stopKeepAlive();
    previous.socket.close(SORTER_LINK_CLOSE_REPLACED, "Replaced");
    previous.client?.close(SORTER_LINK_CLOSE_OFFLINE, "Sorter reconnected");
  }
  links.set(target.deviceGuid, {
    ...target,
    socket,
    client: null,
    stopKeepAlive: keepAlive(socket),
  });
}

export function detachDevice(deviceGuid: string, socket: SorterLinkSocket) {
  const link = links.get(deviceGuid);
  if (!link || link.socket.raw !== socket.raw) return;
  link.stopKeepAlive();
  links.delete(deviceGuid);
  link.client?.close(SORTER_LINK_CLOSE_OFFLINE, "Sorter offline");
}

export function closeDeviceLink(deviceGuid: string, code: number) {
  const link = links.get(deviceGuid);
  if (!link) return;
  link.stopKeepAlive();
  links.delete(deviceGuid);
  link.socket.close(code, "Closed");
  link.client?.close(SORTER_LINK_CLOSE_OFFLINE, "Sorter offline");
}

export function attachClient(
  orgId: string,
  deviceGuid: string,
  socket: SorterLinkSocket,
): AttachClientResult {
  const link = links.get(deviceGuid);
  if (!link || link.orgId !== orgId) return "offline";
  if (link.client) return "in_use";
  link.client = socket;
  socket.send(
    JSON.stringify({
      [SORTER_LINK_READY_KEY]: SORTER_LINK_READY_VALUE,
      firmware: link.firmwareVersion,
    }),
  );
  return "ok";
}

export function detachClient(deviceGuid: string, socket: SorterLinkSocket) {
  const link = links.get(deviceGuid);
  if (link && link.client?.raw === socket.raw) link.client = null;
}

export function relayToDevice(
  deviceGuid: string,
  from: SorterLinkSocket,
  text: string,
) {
  const link = links.get(deviceGuid);
  if (!link || link.client?.raw !== from.raw) return;
  link.socket.send(text.endsWith("\n") ? text : `${text}\n`);
}

export function relayToClient(
  deviceGuid: string,
  from: SorterLinkSocket,
  text: string,
) {
  const link = links.get(deviceGuid);
  if (!link || link.socket.raw !== from.raw) return;
  link.client?.send(text);
}

export function getSorterLinkStatus(
  deviceGuid: string,
  linked: boolean,
): SorterLinkStatus {
  const link = links.get(deviceGuid);
  return {
    guid: deviceGuid,
    linked,
    online: !!link,
    inUse: !!link?.client,
    firmwareVersion: link?.firmwareVersion ?? null,
  };
}
