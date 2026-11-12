import type { PiScanListener } from "@/lib/interfaces/scanner";
import {
  fetchPiScanSession,
  piScanHoldsPort,
} from "@/features/scanner/api/pi-scan-session";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { setPiScanHoldingPort } from "@/features/scanner/lib/pi-scan-hold";
import type { PiScanSessionState } from "@magic-vault/shared";
import { loadPiHost } from "@/lib/pi-host";
import { piScanAnnouncementKey } from "@/features/scanner/lib/pi-scan-status";

let scopeOrgId: string | null | undefined;
let scopeGeneration = 0;
let state: PiScanSessionState = IDLE_PI_SCAN_SESSION;
let holdOverride = false;
let announced: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<PiScanListener>();

function publishHold() {
  setPiScanHoldingPort(holdOverride || piScanHoldsPort(state));
}

function sameSight(
  left: PiScanSessionState["lastCard"],
  right: PiScanSessionState["lastCard"],
) {
  return (
    left?.name === right?.name &&
    left?.binNumber === right?.binNumber &&
    left?.matched === right?.matched
  );
}

function sameState(left: PiScanSessionState, right: PiScanSessionState) {
  return (
    JSON.stringify(left.removalEntries) ===
      JSON.stringify(right.removalEntries) &&
    JSON.stringify(left.soundEvents) === JSON.stringify(right.soundEvents) &&
    left.allowDuplicates === right.allowDuplicates &&
    left.removalEnabled === right.removalEnabled &&
    left.removalBusy === right.removalBusy &&
    left.removalBinNumber === right.removalBinNumber &&
    left.phase === right.phase &&
    left.collectionGuid === right.collectionGuid &&
    left.message === right.message &&
    left.cardsScanned === right.cardsScanned &&
    left.stopping === right.stopping &&
    left.activity === right.activity &&
    left.autoFeed === right.autoFeed &&
    left.foilType === right.foilType &&
    left.condition === right.condition &&
    JSON.stringify(left.preferredSetCodes) ===
      JSON.stringify(right.preferredSetCodes) &&
    left.startedAt === right.startedAt &&
    left.pausedMs === right.pausedMs &&
    left.pausedAt === right.pausedAt &&
    sameSight(left.current, right.current) &&
    sameSight(left.lastCard, right.lastCard)
  );
}

function emit() {
  for (const listener of listeners) listener();
}

export function resetPiScanScope(orgId: string | null) {
  if (scopeOrgId === orgId) return;
  scopeOrgId = orgId;
  scopeGeneration++;
  if (timer) clearInterval(timer);
  timer = null;
  holdOverride = false;
  announced = null;
  state = IDLE_PI_SCAN_SESSION;
  publishHold();
  emit();
  if (orgId) void ensurePolling();
}

export function getPiScanState(): PiScanSessionState {
  return state;
}

export function applyPiScanState(next: PiScanSessionState) {
  if (sameState(state, next)) return;
  state = next;
  publishHold();
  emit();
}

export function setPiScanHoldOverride(value: boolean) {
  holdOverride = value;
  publishHold();
}

export function notePiScanMessage(message: string | null) {
  announced = message ? piScanAnnouncementKey({ ...state, message }) : null;
}

export function takePiScanAnnouncement(
  current: PiScanSessionState,
): "error" | "info" | null {
  if (!current.message || piScanAnnouncementKey(current) === announced)
    return null;
  if (current.phase !== "error" && current.phase !== "stopped") return null;
  announced = piScanAnnouncementKey(current);
  return current.phase === "error" ? "error" : "info";
}

async function pull() {
  const generation = scopeGeneration;
  try {
    const next = await fetchPiScanSession();
    if (generation !== scopeGeneration) return;
    applyPiScanState(next);
  } catch {}
}

async function ensurePolling() {
  if (timer || listeners.size === 0 || scopeOrgId === null) return;
  const generation = scopeGeneration;
  if (
    !(await loadPiHost()) ||
    generation !== scopeGeneration ||
    scopeOrgId === null ||
    timer ||
    listeners.size === 0
  )
    return;
  void pull();
  timer = setInterval(() => void pull(), 1000);
}

export function subscribePiScan(listener: PiScanListener): () => void {
  listeners.add(listener);
  void ensurePolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
