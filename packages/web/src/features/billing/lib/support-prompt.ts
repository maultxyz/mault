import {
  SUPPORT_PROMPT_EVERY_SCANS,
  SUPPORT_PROMPT_FIRST_AFTER_SCANS,
  SUPPORT_PROMPT_MIN_INTERVAL_MS,
} from "@/lib/constants/billing";
import { SUPPORT_PROMPT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { SupportPromptState } from "@/lib/interfaces/billing";

const EMPTY_STATE: SupportPromptState = {
  scans: 0,
  lastShownAt: null,
  optedOut: false,
};

function readState(): SupportPromptState {
  try {
    const raw = localStorage.getItem(SUPPORT_PROMPT_STORAGE_KEY);
    return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: SupportPromptState) {
  try {
    localStorage.setItem(SUPPORT_PROMPT_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function recordSupportPromptScan() {
  const state = readState();
  if (state.optedOut) return;
  writeState({ ...state, scans: state.scans + 1 });
}

export function shouldShowSupportPrompt(now: number): boolean {
  const state = readState();
  if (state.optedOut) return false;
  const threshold =
    state.lastShownAt === null
      ? SUPPORT_PROMPT_FIRST_AFTER_SCANS
      : SUPPORT_PROMPT_EVERY_SCANS;
  if (state.scans < threshold) return false;
  return (
    state.lastShownAt === null ||
    now - state.lastShownAt >= SUPPORT_PROMPT_MIN_INTERVAL_MS
  );
}

export function markSupportPromptShown(now: number) {
  writeState({ ...readState(), scans: 0, lastShownAt: now });
}

export function optOutOfSupportPrompt() {
  writeState({ ...readState(), optedOut: true });
}
