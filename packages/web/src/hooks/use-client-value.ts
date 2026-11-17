import { useSyncExternalStore } from "react";

function subscribeToNothing() {
  return () => {};
}

export function useClientValue<T>(getClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(
    subscribeToNothing,
    getClientValue,
    () => serverValue,
  );
}
