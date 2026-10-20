import { API_BASE } from "@/lib/constants/api";
import { getAuthHeaders } from "@/lib/api/client";
import {
  PI_SCAN_SESSION_PATH,
  type PiScanSessionResult,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
  type PiScanSessionState,
} from "@magic-vault/shared";
import {
  isPiScanHoldingPort,
  setPiScanHoldingPort,
} from "@/features/scanner/lib/pi-scan-hold";

const PI_SCAN_SESSION_API = `/api${PI_SCAN_SESSION_PATH}`;

export const IDLE_PI_SCAN_SESSION: PiScanSessionState = {
  phase: "idle",
  collectionGuid: null,
  message: null,
  cardsScanned: 0,
  stopping: false,
  activity: null,
  current: null,
  lastCard: null,
  startedAt: null,
  pausedMs: 0,
  pausedAt: null,
  autoFeed: true,
};

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
