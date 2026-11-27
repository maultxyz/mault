import type {
  PiScanApi,
  PiScanApiBody,
  PiScanApiResponse,
} from "../interfaces/pi-scan-api";

let configuredApi: PiScanApi | null = null;

export function setPiScanApi(api: PiScanApi | null) {
  configuredApi = api;
}

export async function piScanApi(): Promise<PiScanApi> {
  if (!configuredApi) throw new Error("The Pi scan API is not configured.");
  return configuredApi;
}

export async function toPiScanApiResponse<T>(response: Response): Promise<PiScanApiResponse<T>> {
  const body = (await response.json().catch(() => ({ success: false }))) as PiScanApiBody<T>;
  return { ok: response.ok && body.success !== false, status: response.status, body };
}
