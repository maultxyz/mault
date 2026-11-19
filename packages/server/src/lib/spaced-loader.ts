import type { SpacedLoader, SpacedLoaderSlot } from "./interfaces/cached-value";

export function createSpacedLoader<T>(
  minimumMsBetweenLoads: number,
  maxKeys: number,
): SpacedLoader<T> {
  const slots = new Map<string, SpacedLoaderSlot<T>>();

  function forgetSettledSlots() {
    const now = Date.now();
    for (const [key, slot] of slots) {
      if (!slot.waitingLoad && slot.lastStartedAt + minimumMsBetweenLoads <= now) {
        slots.delete(key);
      }
    }
  }

  return {
    load(key, load) {
      let slot = slots.get(key);
      if (slot?.waitingLoad) return slot.waitingLoad;
      if (!slot) {
        if (slots.size >= maxKeys) forgetSettledSlots();
        slot = { lastStartedAt: 0, waitingLoad: null };
        slots.set(key, slot);
      }
      const startedSlot = slot;
      const waitMs = startedSlot.lastStartedAt + minimumMsBetweenLoads - Date.now();
      if (waitMs <= 0) {
        startedSlot.lastStartedAt = Date.now();
        return load();
      }
      const waitingLoad = new Promise<void>((resolve) => setTimeout(resolve, waitMs)).then(() => {
        startedSlot.waitingLoad = null;
        startedSlot.lastStartedAt = Date.now();
        return load();
      });
      startedSlot.waitingLoad = waitingLoad;
      return waitingLoad;
    },
  };
}
