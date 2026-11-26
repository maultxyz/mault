import { API_BASE } from "@/lib/constants/api";
import { loadPiHost } from "@/lib/pi-host";
import { PI_SCAN_SESSION_API } from "@/lib/constants/scanner";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { getAuthHeaders, getRequestAuth } from "@/lib/api/client";
import {
  type PiScanSessionResult,
  type PiScanRemovalAction,
  type PiScanSessionSettingsBody,
  type PiScanSessionStartBody,
  type PiScanSessionState,
} from "@magic-vault/shared";
import { piScanSessionApiPath } from "@/features/scanner/lib/pi-scan-target";
import {
  isPiScanHoldingPort,
  setPiScanHoldingPort,
} from "@/features/scanner/lib/pi-scan-hold";

async function send(
  method: string,
  path: string,
  body?: unknown,
): Promise<PiScanSessionResult> {
  const headers = new Headers(await getAuthHeaders());
  const requestOrgId = headers.get("X-Org-Id");
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(headers.entries()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as PiScanSessionResult;
  const currentAuth = await getRequestAuth();
  if (currentAuth.orgId !== requestOrgId)
    return { ...result, success: false, data: undefined };
  return result;
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
    const requestAuth = await getRequestAuth();
    const state = await fetchPiScanSession();
    const currentAuth = await getRequestAuth();
    if (requestAuth.orgId !== currentAuth.orgId) return isPiScanHoldingPort();
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
  return send("POST", piScanSessionApiPath(), body);
}

export function pausePiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("pause"));
}

export function resumePiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("resume"));
}

export function emergencyStopPiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("emergency-stop"));
}

export function stopPiScanSession(): Promise<PiScanSessionResult> {
  return send("DELETE", piScanSessionApiPath());
}

export function updatePiScanSettings(
  body: PiScanSessionSettingsBody,
): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("settings"), body);
}

export function resetPiScanSessionStats(): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("reset-stats"));
}

export function feedPiScanSession(): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("feed"));
}

export function updatePiScanRemoval(
  body: PiScanRemovalAction,
): Promise<PiScanSessionResult> {
  return send("POST", piScanSessionApiPath("removal"), body);
}
