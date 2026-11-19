import type { WhatsNewState } from "@/lib/interfaces/feature-highlights";
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const closedWhatsNewState: WhatsNewState = { isOpen: false, openRequestId: 0 };
let whatsNewState: WhatsNewState = closedWhatsNewState;

function setWhatsNewState(nextState: WhatsNewState): void {
  whatsNewState = nextState;
  listeners.forEach((listener) => listener());
}

export function openWhatsNew(): void {
  setWhatsNewState({
    isOpen: true,
    openRequestId: whatsNewState.openRequestId + 1,
  });
}

export function closeWhatsNew(): void {
  if (!whatsNewState.isOpen) return;
  setWhatsNewState({ ...whatsNewState, isOpen: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readWhatsNewState(): WhatsNewState {
  return whatsNewState;
}

function readServerWhatsNewState(): WhatsNewState {
  return closedWhatsNewState;
}

export function useWhatsNewState(): WhatsNewState {
  return useSyncExternalStore(subscribe, readWhatsNewState, readServerWhatsNewState);
}
