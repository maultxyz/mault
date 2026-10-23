import { API_BASE } from "@/lib/constants/api";
import { loadPiHost } from "@/lib/pi-host";
import { PI_SCAN_SESSION_API } from "@/lib/constants/scanner";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { getAuthHeaders } from "@/lib/api/client";
import {
  type PiScanSessionResult,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
  type PiScanSessionState,
} from "@magic-vault/shared";
import {
  isPiScanHoldingPort,
  setPiScanHoldingPort,
} from "@/features/scanner/lib/pi-scan-hold";

async function send(
  method: string,
  path: string,
  body?: unknown,
): Promise<PiScanSessionResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return (await response.json()) as PiScanSessionResult;
}

export function piScanHoldsPort(state: PiScanSessionState): boolean {
  return state.phase === "running" || state.phase === "paused";
}

export async function fetchPiScanSession(): Promise<PiScanSessionState> {
  if (!(await loadPiHost())) return IDLE_PI_SCAN_SESSION;
  const result = await send("GET", PI_SCAN_SESSION_API);
  return result.data ?? IDLE_PI_SCAN_SESSION;
}

export async function refreshPiScanHold(): Promise<boolean> {
  try {
    const state = await fetchPiScanSession();
    const held = piScanHoldsPort(state);
    setPiScanHoldingPort(held);
    return held;
  } catch {
    return isPiScanHoldingPort();
  }
}

export function startPiScanSession(
  body: PiScanSessionStartBody,
): Promise<PiScanSessionResult> {
  return send("POST", PI_SCAN_SESSION_API, body);
}

export function pausePiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", `${PI_SCAN_SESSION_API}/pause`);
}

export function resumePiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", `${PI_SCAN_SESSION_API}/resume`);
}

export function stopPiScanSession(): Promise<PiScanSessionResult> {
  return send("DELETE", PI_SCAN_SESSION_API);
}

export function updatePiScanSettings(
  body: PiScanSessionSettingsBody,
): Promise<PiScanSessionResult> {
  return send("POST", `${PI_SCAN_SESSION_API}/settings`, body);
}

export function feedPiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", `${PI_SCAN_SESSION_API}/feed`);
}
