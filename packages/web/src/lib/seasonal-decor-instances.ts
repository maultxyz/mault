let mountedDecorIds: string[] = [];
const decorInstanceListeners = new Set<() => void>();

function notifyDecorInstanceListeners() {
  decorInstanceListeners.forEach((listener) => listener());
}

export function registerSeasonalDecorInstance(decorId: string): () => void {
  mountedDecorIds = [...mountedDecorIds, decorId];
  notifyDecorInstanceListeners();
  return () => {
    mountedDecorIds = mountedDecorIds.filter((mountedId) => mountedId !== decorId);
    notifyDecorInstanceListeners();
  };
}

export function topmostSeasonalDecorId(): string | null {
  return mountedDecorIds.at(-1) ?? null;
}

export function subscribeToSeasonalDecorInstances(listener: () => void): () => void {
  decorInstanceListeners.add(listener);
  return () => {
    decorInstanceListeners.delete(listener);
  };
}
