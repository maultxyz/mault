import type { PiScanApi } from "../interfaces/pi-scan-api";
import { requestAsScanActor } from "../scan-actor-routes";
import { toPiScanApiResponse } from "./api";

export const localPiScanApi: PiScanApi = {
  async request(actor, method, path, body) {
    const response = await requestAsScanActor({
      actor,
      method,
      path,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response) throw new Error(`No scan route handles ${path}.`);
    return toPiScanApiResponse(response);
  },
};
