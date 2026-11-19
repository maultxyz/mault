import { AppState, type NativeEventSubscription } from "react-native";
import type { PendingCardRemoval } from "@/lib/interfaces/undo";

const pendingCardRemovals = new Map<number, PendingCardRemoval>();
let nextPendingCardRemovalId = 1;
let appStateSubscription: NativeEventSubscription | null = null;

function commitAllPendingCardRemovals(): void {
  for (const pendingRemovalId of [...pendingCardRemovals.keys()]) void commitPendingCardRemoval(pendingRemovalId);
}

function ensureCommitOnBackground(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "background") commitAllPendingCardRemovals();
  });
}

export function registerPendingCardRemoval(commit: () => Promise<void>): number {
  ensureCommitOnBackground();
  const pendingRemovalId = nextPendingCardRemovalId++;
  pendingCardRemovals.set(pendingRemovalId, { commit });
  return pendingRemovalId;
}

export function cancelPendingCardRemoval(pendingRemovalId: number): boolean {
  return pendingCardRemovals.delete(pendingRemovalId);
}

export async function commitPendingCardRemoval(pendingRemovalId: number): Promise<void> {
  const pendingRemoval = pendingCardRemovals.get(pendingRemovalId);
  if (!pendingRemoval) return;
  pendingCardRemovals.delete(pendingRemovalId);
  await pendingRemoval.commit();
}
