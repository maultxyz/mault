import { PI_LINK_DEVICE_PATH } from "@magic-vault/shared";
import {
  PI_LINK_DEVICE_API_SEGMENT,
  PI_LINK_REQUEST_TIMEOUT_MS,
  PI_LINK_SCAN_ACTOR_HEADER,
} from "../constants/scan-host";
import type { PiScanApi, RemotePiScanApiOptions } from "../interfaces/pi-scan-api";
import { toPiScanApiResponse } from "./api";

export function createRemotePiScanApi({ baseUrl, token }: RemotePiScanApiOptions): PiScanApi {
  const root = `${baseUrl.replace(/\/+$/, "")}${PI_LINK_DEVICE_PATH}${PI_LINK_DEVICE_API_SEGMENT}`;
  return {
    async request(actor, method, path, body) {
      const response = await fetch(`${root}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          [PI_LINK_SCAN_ACTOR_HEADER]: actor.userId,
          "Content-Type": "application/json",
        },
        body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(PI_LINK_REQUEST_TIMEOUT_MS),
      });
      return toPiScanApiResponse(response);
    },
  };
}
