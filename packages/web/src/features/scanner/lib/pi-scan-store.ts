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
    left.phase === right.phase &&
    left.collectionGuid === right.collectionGuid &&
    left.message === right.message &&
    left.cardsScanned === right.cardsScanned &&
    left.stopping === right.stopping &&
    left.activity === right.activity &&
    left.autoFeed === right.autoFeed &&
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
  if (!current.message || piScanAnnouncementKey(current) === announced) return null;
  if (current.phase !== "error" && current.phase !== "stopped") return null;
  announced = piScanAnnouncementKey(current);
  return current.phase === "error" ? "error" : "info";
}

async function pull() {
  try {
    applyPiScanState(await fetchPiScanSession());
  } catch {
  }
}

async function ensurePolling() {
  if (!(await loadPiHost()) || timer || listeners.size === 0) return;
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
