import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const subscribeToOnlineState = (onChange: () => void) => onlineManager.subscribe(onChange);
const readOnlineState = () => onlineManager.isOnline();

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeToOnlineState, readOnlineState, readOnlineState);
}
