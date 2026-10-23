import { getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  PI_UPDATE_API,
  PI_UPDATE_REQUEST_TIMEOUT_MS,
} from "@/lib/constants/pi-update";
import type { PiUpdateResponse } from "@/lib/interfaces/pi-update";
import type { PiUpdateState, PiUpdateStatus } from "@magic-vault/shared";

async function request<T>(method: "GET" | "POST"): Promise<T> {
  const response = await fetch(`${API_BASE}${PI_UPDATE_API}`, {
    method,
    headers: await getAuthHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(PI_UPDATE_REQUEST_TIMEOUT_MS),
  });
  const body = (await response.json()) as PiUpdateResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.message || "The update request failed.");
  }
  return body.data;
}

export const getPiUpdateStatus = () => request<PiUpdateStatus>("GET");
export const startPiUpdate = () => request<PiUpdateState>("POST");
