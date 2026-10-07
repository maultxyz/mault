import {
  HOTKEY_BLOCKING_OVERLAY_SELECTOR,
  HOTKEY_IGNORED_TARGET_SELECTOR,
  HOTKEY_SEQUENCE_TIMEOUT_MS,
  HOTKEYS,
} from "@/lib/constants/hotkeys";
import type {
  HotkeyCombo,
  HotkeyId,
  HotkeyRegistration,
} from "@/lib/interfaces/hotkeys";

const registrations = new Set<HotkeyRegistration>();
let pendingCombo: { combo: HotkeyCombo; at: number } | null = null;

function toCombo(event: KeyboardEvent): HotkeyCombo {
  return { key: event.key.toLowerCase(), shift: event.shiftKey };
}

function comboMatches(expected: HotkeyCombo, actual: HotkeyCombo) {
  if (expected.key.toLowerCase() !== actual.key) return false;
  const isLetter = /^[a-z]$/.test(actual.key);
  return !isLetter || !!expected.shift === !!actual.shift;
}

function sequenceMatches(expected: HotkeyCombo[], actual: HotkeyCombo[]) {
  return (
    expected.length === actual.length &&
    expected.every((combo, i) => comboMatches(combo, actual[i]))
  );
}

function findHandler(sequence: HotkeyCombo[]) {
  let best: { handler: () => void; priority: number } | null = null;
  for (const registration of registrations) {
    if (!registration.isEnabled()) continue;
    if (best && registration.priority <= best.priority) continue;
    const handlers = registration.getHandlers();
    for (const [id, handler] of Object.entries(handlers)) {
      if (
        handler !== undefined &&
        sequenceMatches(HOTKEYS[id as HotkeyId].keys, sequence)
      ) {
        best = { handler, priority: registration.priority };
        break;
      }
    }
  }
  return best?.handler ?? null;
}

function startsAnySequence(combo: HotkeyCombo) {
  for (const registration of registrations) {
    if (!registration.isEnabled()) continue;
    for (const [id, handler] of Object.entries(registration.getHandlers())) {
      const keys = HOTKEYS[id as HotkeyId].keys;
      if (
        handler !== undefined &&
        keys.length > 1 &&
        comboMatches(keys[0], combo)
      ) {
        return true;
      }
    }
  }
  return false;
}

function isIgnoredTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    (target.closest(HOTKEY_IGNORED_TARGET_SELECTOR) !== null ||
      (target instanceof HTMLElement && target.isContentEditable))
  );
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat || event.isComposing) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isIgnoredTarget(event.target)) return;
  if (document.querySelector(HOTKEY_BLOCKING_OVERLAY_SELECTOR)) return;

  const combo = toCombo(event);
  const previous =
    pendingCombo && Date.now() - pendingCombo.at < HOTKEY_SEQUENCE_TIMEOUT_MS
      ? pendingCombo.combo
      : null;
  pendingCombo = null;

  const handler =
    (previous && findHandler([previous, combo])) ?? findHandler([combo]);
  if (handler) {
    event.preventDefault();
    handler();
    return;
  }

  if (startsAnySequence(combo)) {
    event.preventDefault();
    pendingCombo = { combo, at: Date.now() };
  }
}

export function registerHotkeys(registration: HotkeyRegistration) {
  if (registrations.size === 0) {
    document.addEventListener("keydown", handleKeyDown);
  }
  registrations.add(registration);
  return () => {
    registrations.delete(registration);
    if (registrations.size === 0) {
      document.removeEventListener("keydown", handleKeyDown);
      pendingCombo = null;
    }
  };
}

export function focusHotkeySearch(selector: string) {
  const inputs = document.querySelectorAll<HTMLInputElement>(selector);
  const visible = Array.from(inputs).find(
    (input) => input.offsetParent !== null && !input.disabled,
  );
  if (!visible) return false;
  visible.focus();
  visible.select();
  return true;
}
